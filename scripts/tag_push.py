import os
import subprocess
import sys

def load_env():
    env_paths = [
        r"C:\Users\XIANZ\.gemini\config\.env",
        r"C:\Users\XIANZ\.env"
    ]
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        return token
    for p in env_paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GITHUB_TOKEN="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None

def tag_and_push():
    token = load_env()
    cwd = r"C:\Users\XIANZ\.gemini\antigravity\scratch\deepseek-harness-desktop"

    # Git commit cleanup
    subprocess.run(["git", "add", "-A"], cwd=cwd, check=True)
    subprocess.run(["git", "commit", "-m", "chore: clean up build scripts and finalize standard structure"], cwd=cwd)

    # Add tag v1.0.0
    subprocess.run(["git", "tag", "-a", "v1.0.0", "-m", "Release v1.0.0 - DeepSeek Harness Desktop"], cwd=cwd, check=True)

    # Set authenticated remote URL
    auth_remote = f"https://x-access-token:{token}@github.com/Rikka06/deepseek-harness-desktop.git"
    clean_remote = "https://github.com/Rikka06/deepseek-harness-desktop.git"

    subprocess.run(["git", "remote", "set-url", "origin", auth_remote], cwd=cwd, check=True)
    print("Pushing main and tags to GitHub...")
    subprocess.run(["git", "push", "origin", "main"], cwd=cwd, check=True)
    subprocess.run(["git", "push", "origin", "--tags"], cwd=cwd, check=True)

    # Reset to clean URL
    subprocess.run(["git", "remote", "set-url", "origin", clean_remote], cwd=cwd, check=True)
    print("Tags pushed successfully and remote secured!")

if __name__ == "__main__":
    tag_and_push()
