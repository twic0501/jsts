# Notes

Notes are local-user records (`local`) tied to a paper and optionally an immutable offset anchor. They calculate anchor status at read time and use atomic revision checks for edits.

These are the project's first write APIs and have no authentication. Deploy only behind the documented Nginx/Basic Auth protection.
