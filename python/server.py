from flask import Flask, request
import json
import os
import datetime
import shutil

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))).replace('\\', '/')
backup_dir = f'{root_dir}/tmp/backup'

if not os.path.isdir(backup_dir):
    os.makedirs(backup_dir)

app = Flask(__name__, static_folder=f'{root_dir}/public', static_url_path="/")

def write_index(data):
    text = data["text"]
    print(f"text:[{text}]")

    path = "public/data/graph.json"

    dt = datetime.datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
    dst = f"{backup_dir}/graph-{dt}.json"

    shutil.copy2(path, dst)
    print(f"copy {path} to {dst}")

    with open(path, 'w', encoding='UTF-8') as f:
        f.write(text)

def write_movie(data):
    text = data["text"]
    print(f"text:[{text}]")

    id   = data["id"]
    path = f"public/data/script/{id}.py"
    print(path)
    print(text)

    dt = datetime.datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
    dst = f"{backup_dir}/script/{id}-{dt}.py"
    shutil.copy2(path, dst)

    with open(path, 'w', encoding='UTF-8') as f:
        f.write(text)

@app.route("/db", methods=["POST"])
def hello_world():
    print("cwd", os.getcwd())
    text = request.data.decode('utf-8')
    data = json.loads(text)
    command = data["command"]
    if command == "write-index":

        write_index(data)

    elif command == "write-movie":
        write_movie(data)

    return { "status" : "write OK"}