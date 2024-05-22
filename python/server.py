from flask import Flask, request
import json
import os
import datetime
import shutil

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))).replace('\\', '/')

app = Flask(__name__, static_folder=f'{root_dir}/public', static_url_path="/")

def write_index(data):
    text = data["text"]
    print(f"text:[{text}]")

    path = "public/data/graph.json"

    dt = datetime.datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
    dst = f"tmp/backup/graph-{dt}.json"

    shutil.copy2(path, dst)
    print(f"copy {path} to {dst}")

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

    return { "status" : "write OK"}