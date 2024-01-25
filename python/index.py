import glob
import os
import json
import codecs
from pathlib import Path

def enumDir(parent_dir, path):
    print(f"enum:{parent_dir}")

    for path_obj in path.iterdir():

        title = os.path.splitext(os.path.basename(path_obj))[0]
        if os.path.isdir(path_obj):
            child_dir = { 'title' : title, 'dirs':[], 'files':[] }
            parent_dir['dirs'].append(child_dir)
            enumDir(child_dir, path_obj)

        elif os.path.isfile(path_obj):
            file_path = str(path_obj).replace('\\', '/').replace('web/data/', '')
            print(f"file:{file_path}")
            if(file_path.endswith(".json")):
                continue

            with codecs.open(path_obj, 'r', 'utf-8') as f:
                lines = f.readlines()
                for line in lines:
                    if line.strip().startswith("@title"):
                        title = line[len("@title"):].strip()

            
            parent_dir['files'].append({'title': title, 'path' : file_path})


def main():
    dir_obj = { 'title' : "", 'dirs':[], 'files':[] }
    path = Path("web/data")
    enumDir(dir_obj, path)

    with open('web/data/index.json', 'w') as file:
        json.dump(dir_obj, file, indent=4)    

if __name__ == '__main__':
    main()