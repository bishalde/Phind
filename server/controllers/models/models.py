from pymongo import MongoClient
from bson import ObjectId
import os
import datetime

from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection = os.getenv("MONGO_COLLECTION_MODELS")

client = MongoClient(mongo_uri)
db = client[mongo_db]
collection = db[mongo_collection]

def serialize_model(model):
    model['_id'] = str(model['_id'])  
    return model

def add_model(data):
    try:
        model = {
            "name": data['name'],
            "parameter": data['parameter'],
            "path": data['path'],
            "size": data['size'],
            "created_at": datetime.datetime.now(),
        }

        collection.insert_one(model)
        return {"message": "Model added successfully"}, 200
    except Exception as e:
        return {"error": str(e)}, 500
    
def get_models():
    try:
        models = collection.find({})
        all_models = [serialize_model(model) for model in models]
        return {"models": all_models}, 200
    except Exception as e:
        return {"error": str(e)}, 500
    
def delete_model(model_id):
    try:
        result = collection.delete_one({"_id": ObjectId(model_id)})
        if result.deleted_count > 0:
            return {"message": "Model deleted successfully"}, 200
        else:
            return {"error": "Model not found"}, 404
    except Exception as e:
        return {"error": str(e)}, 500