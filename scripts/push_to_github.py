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

def git_push():
    token = load_env()
    if not token:
        print("Error: GITHUB_TOKEN not found!")
        sys.exit(1)
        
    cwd = r"C:\Users\XIANZ\.gemini\antigravity\scratch\deepseek-harness-desktop"

    # Git init
    subprocess.run(["git", "init"], cwd=cwd, check=True)
    subprocess.run(["git", "config", "user.name", "Rikka"], cwd=cwd, check=True)
    subprocess.run(["git", "config", "user.email", "rikka@users.noreply.github.com"], cwd=cwd, check=True)
    subprocess.run(["git", "branch", "-M", "main"], cwd=cwd, check=True)

    # Git add
    subprocess.run(["git", "add", "."], cwd=cwd, check=True)
    subprocess.run(["git", "commit", "-m", "feat: initial release of DeepSeek Harness Desktop (v1.0.0)"], cwd=cwd, check=True)

    # Set authenticated remote URL
    auth_remote = f"https://x-access-token:{token}@github.com/Rikka06/deepseek-harness-desktop.git"
    clean_remote = "https://github.com/Rikka06/deepseek-harness-desktop.git"

    # Check if origin exists
    res = subprocess.run(["git", "remote"], cwd=cwd, capture_output=True, text=True)
    if "origin" in res.stdout:
        subprocess.run(["git", "remote", "set-url", "origin", auth_remote], cwd=cwd, check=True)
    else:
        subprocess.run(["git", "remote", "add", "origin", auth_remote], cwd=cwd, check=True)

    print("Pushing to GitHub...")
    subprocess.run(["git", "push", "-u", "origin", "main", "--force"], cwd=cwd, check=True)

    # Reset remote URL to clean URL (no credentials in .git/config)
    subprocess.run(["git", "remote", "set-url", "origin", clean_remote], cwd=cwd, check=True)
    print("Push completed successfully and remote URL secured!")

if __name__ == "__main__":
    git_push()
