@~/.claude/prompts/new_functionality_prompt_spec.md

# Create a Github CI/CD Pipeline and Deploy App to VM at Google Cloud

## Role
Act as a Software Architect, you are an expert in Github and Google Cloud Services

## Task
Create Github actions that allows to compile and deploy the NextJS app to ssh -i C:\ubuntuiso\.ssh\vboxuser gcvmuser@34.174.56.186 in the directory ~/MISEIA1150_lista-tareas. The build must be done in a GitHub Action. The service must be created in the remote ubuntu VM

The app must be accessible through Traefik using the domain miseia1150_listatareas.deviaaps.com, port 30001, use the traefik wildcard *.deviaaps.com.

Use gh and gcloud for all secrets required.
