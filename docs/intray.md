
Epic: to create integration with github to modify ttl files in the data folder.
- MVP is to simply provide a simple text editor to select / modify a ttl file.
- You should be able to select the file, change it, and save it. Saving it should trigger a rebuild of the data folder.
- The build should be triggered by a github action, for push to main, or workflow_dispatch. No versioning required yet.
- The a gh user that has access to the repo should be able to select the file, change it, and save it.
- What options do we have, do we need to setup a server side process to handle editing or auth integration?
- Is there a minimal way to do this? Can we do it without any server side process?
- If someone is not logged in, they should be able to view the file. They can edit it, but they cannot save it.
