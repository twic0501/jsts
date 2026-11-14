# Collections

Collections and memberships are separate writable stores. Deleting a collection deletes only its membership rows, never a paper. Mongo standalone deployments accept the small race where a membership is added while its collection is being deleted; reads join only extant collections.

These are the project's first write APIs and have no authentication. Deploy only behind the documented Nginx/Basic Auth protection.
