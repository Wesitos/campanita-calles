from pymongo import MongoClient
import json

database = MongoClient().campanita

data = json.load(open("data.json", ))

for k,nodo in enumerate(data["nodes"]):
    nodo["_id"] = nodo["id"]
    nodo.pop("id")
    if not "tags" in nodo.keys():
        nodo["tags"] = {}

for k,cuadra in enumerate(data["cuadras"]):
    cuadra["_id"] = cuadra["id"]
    cuadra.pop("id")
    if not "tags" in cuadra.keys():
        cuadra["tags"] = {}

database.nodes.insert(data["nodes"])
database.cuadras.insert(data["cuadras"])

