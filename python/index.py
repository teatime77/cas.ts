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
            file_path = str(path_obj).replace('\\', '/').replace('public/data/', '')
            print(f"file:{file_path}")
            if(file_path.endswith(".json")):
                continue

            formula = None
            with codecs.open(path_obj, 'r', 'utf-8') as f:
                lines = f.readlines()
                for line in lines:
                    if line.startswith("@title"):
                        title = line[len("@title"):].strip()

                    elif line.startswith("@formula"):
                        formula = line[len("@formula"):].strip()
            
            item = {'title': title, 'path' : file_path}
            if not formula is None:
                item['formula'] = formula

            parent_dir['files'].append(item)


def main():
    dir_obj = { 'title' : "", 'dirs':[], 'files':[] }
    path = Path("public/data")
    enumDir(dir_obj, path)

    with open('public/data/index.json', 'w', encoding="utf-8") as file:
        json.dump(dir_obj, file, indent=4, ensure_ascii=False)    

if __name__ == '__main__':
    main()