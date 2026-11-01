import os
from pathlib import Path

from dotenv import load_dotenv
from pwdlib import PasswordHash
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError

from database.database import SessionLocal
from models import Role, User


load_dotenv(Path(__file__).resolve().with_name(".env"))


def ensure_admin_account() -> bool:
    email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    phone = os.environ.get("ADMIN_PHONE", "").strip()
    full_name = os.environ.get("ADMIN_NAME", "").strip()
    password = os.environ.get("ADMIN_PASSWORD", "")
    config = (email, phone, full_name, password)

    if not any(config):
        return False
    if not all(config):
        raise RuntimeError(
            "Cần đặt ADMIN_EMAIL, ADMIN_PHONE, ADMIN_NAME và ADMIN_PASSWORD."
        )
    if len(password) < 12:
        raise RuntimeError("ADMIN_PASSWORD cần có ít nhất 12 ký tự.")

    with SessionLocal() as db:
        user = db.scalar(
            select(User).where(
                or_(
                    func.lower(User.email) == email,
                    User.phone == phone,
                    )
            )
        )

        if user is not None:
            identifiers_match = (
                    user.email.strip().lower() == email and user.phone == phone
            )
            if not identifiers_match:
                raise RuntimeError(
                    "Email hoặc số điện thoại đã thuộc tài khoản khác; "
                    "không thay đổi tài khoản đó."
                )
            if any(role.name.strip().casefold() == "admin" for role in user.roles):
                return False
            raise RuntimeError(
                "Tài khoản đã tồn tại nhưng chưa có quyền admin; "
                "script không tự nâng quyền tài khoản hiện hữu."
            )

        role = db.scalar(
            select(Role).where(func.lower(Role.name) == "admin")
        )
        if role is None:
            role = Role(name="admin", description="Quản trị viên")

        user = User(
            email=email,
            phone=phone,
            full_name=full_name,
            password_hash=PasswordHash.recommended().hash(password),
            roles=[role],
        )
        db.add(user)

        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise RuntimeError(
                "Không thể tạo tài khoản; email hoặc số điện thoại có thể đã được dùng."
            ) from exc

    return True


def main() -> None:
    if ensure_admin_account():
        print("Đã tạo tài khoản admin.")
        return
    if not any(
        os.environ.get(key)
        for key in ("ADMIN_EMAIL", "ADMIN_PHONE", "ADMIN_NAME", "ADMIN_PASSWORD")
    ):
        raise SystemExit(
            "Cần đặt ADMIN_EMAIL, ADMIN_PHONE, ADMIN_NAME và ADMIN_PASSWORD."
        )
    print("Tài khoản admin này đã tồn tại; không có thay đổi.")


if __name__ == "__main__":
    main()