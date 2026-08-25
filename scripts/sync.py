import os
import subprocess

def load_token():
    with open(r"C:\Users\XIANZ\.gemini\config\.env", "r", encoding="utf-8") as f:
        for line in f:
            if line.strip().startswith("GITHUB_TOKEN="):
                return line.strip().split("=", 1)[1].strip().strip('"').strip("'")
    return None

def main():
    token = load_token()
    cwd = r"C:\Users\XIANZ\.gemini\antigravity\scratch\deepseek-harness-desktop"
    subprocess.run(["git", "add", "-A"], cwd=cwd, check=True)
    res = subprocess.run(["git", "status", "--porcelain"], cwd=cwd, capture_output=True, text=True)
    if res.stdout.strip():
        subprocess.run(["git", "commit", "-m", "chore: remove temporary helper script"], cwd=cwd, check=True)
        auth = f"https://x-access-token:{token}@github.com/Rikka06/deepseek-harness-desktop.git"
        clean = "https://github.com/Rikka06/deepseek-harness-desktop.git"
        subprocess.run(["git", "remote", "set-url", "origin", auth], cwd=cwd, check=True)
        subprocess.run(["git", "push", "origin", "main"], cwd=cwd, check=True)
        subprocess.run(["git", "remote", "set-url", "origin", clean], cwd=cwd, check=True)
    print("Git repository synchronized successfully!")

if __name__ == "__main__":
    main()
