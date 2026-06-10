import re
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token
from extensions import db
from models.user import User

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")


def is_valid_email(email):
    if not email:
        return False
    return bool(EMAIL_REGEX.match(email))


def is_strong_password(password):
    if not password:
        return False
    # Minimum 8 characters
    if len(password) < 8:
        return False
    # At least one uppercase, one lowercase, and one digit
    if not any(c.isupper() for c in password):
        return False
    if not any(c.islower() for c in password):
        return False
    if not any(c.isdigit() for c in password):
        return False
    return True


def generate_tokens(user):
    """Generates an access token and a refresh token for a given user."""
    additional_claims = {
        "email": user.email,
        "role": user.role
    }
    # Identity is set to user.id as a string representation
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id))
    return access_token, refresh_token


def register_user(email, password, full_name, organization=None):
    """Registers a new user and returns user info + tokens, or returns an error dict."""
    if not email or not password or not full_name:
        return {"error": "Missing required fields", "status": 400}

    # Normalize email to lowercase
    email = email.strip().lower()

    if not is_valid_email(email):
        return {"error": "Invalid email format", "status": 400}

    if not is_strong_password(password):
        return {
            "error": "Password is too weak. It must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.",
            "status": 422
        }

    # Check for duplicate email
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return {"error": "Email already registered", "status": 409}

    # Create user
    password_hash = generate_password_hash(password)
    user = User(
        email=email,
        password_hash=password_hash,
        full_name=full_name.strip(),
        organization=organization.strip() if organization else None,
        last_login=datetime.utcnow()
    )

    db.session.add(user)
    db.session.commit()

    access_token, refresh_token = generate_tokens(user)
    return {
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token,
        "status": 201
    }


def login_user(email, password):
    """Verifies credentials, updates login time, and returns user info + tokens or error."""
    if not email or not password:
        return {"error": "Missing email or password", "status": 400}

    email = email.strip().lower()
    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return {"error": "Invalid credentials", "status": 401}

    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()

    access_token, refresh_token = generate_tokens(user)
    return {
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token,
        "status": 200
    }
