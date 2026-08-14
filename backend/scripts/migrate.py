from app.database import run_migrations


if __name__ == "__main__":
    print(f"schema_version={run_migrations()}")

