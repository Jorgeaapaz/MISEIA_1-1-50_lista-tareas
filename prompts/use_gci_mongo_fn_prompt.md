@~/.claude/prompts/new_functionality_prompt_spec.md

# New PDF Report Generation

## Role
Act as a software developer, you are an expert in NextJS and MongoDB

## Task
Use the following connection string to connect to Google Cloud's Virtual Machine Docker MongoDB instance,  the connection string is:

mongodb://admin:MongoAdmin2024!@34.174.56.186:27020/?authSource=admin

Create the database if it doesn't exits, seed the `tareas` table with at least 30 records with mixed status. 

If the isntance is not reachable, use a set of 3 mock records and show a orange band at the bottom of the page, with the message `You are not connected to the Database, Click on Reconnect`. In the same band provide a button to try to reconnect to the server. If the connection is ok, clear the list and get data from the remote  mongodb instance.

Show a small icon on the bottom of the page to indicate if the app is connedted (green) or not (red), to the database.
