# Next Features

<!-- Add upcoming features here -->

# Repo structure

- currently we have a repo that contains the vocabularies in ttl format, we have our build process for the static site, github actions, and we have the static site itself.

- assess the most minimal repo an organisation would need to setup to be able to publish their vocabularies as a static site.

an example of what that might look like:
- split prez-lite repo into it's own repo - prez-lite
   - this repo contains the main prez-lite nuxt app
   - this repo contains the github action that builds the static site
   - this repo contains the build process for the static site
   - this repo contains the action that gets the background labels and manifest

for an organisation to use the prez-lite app, they would create their own repo with their vocabularies in ttl format. there other requirements are:
 - to be able to get all the background labels
 - set any configuration options for labels, e.g. preferred labels
 - be able to run a build step that converts the ttl files to json
 - define any configuration options for the app, e.g. logo, title, description, etc.
 - add any styling requirements, e.g. base font, colors, etc.
 - overwrite any pages in the app, e.g. home page, about page, search page, etc.
 - deploy their static site to gh pages, or azure, or aws (these should be supported options)

 there will be many organisations that want to use the prez-lite app, so we need to make it as easy as possible for them to use.

 the idea is that prez-lite is made available as a nuxt app. potential models:
 - simple installation - gh action installs prez-lite by referencing the prez-lite repo, we can have an app or web folder that contains the configuration for the app. we could have a default styles css / variables, and app folder that contains the placeholders for the pages to be overwritten.
 - advanced installation - we have a nuxt app in the repo that uses prez-lite as the base layer, and the organisation can then overwrite the pages and styles as needed.

 The next step is to assess the requirements above and create a plan for both repos. What options exist out in the wild? Should we have a template gh repo that can be used to create a new repo? Should we use gh applications on a repo to trigger functionality? Should we just have the advanced installation option? Can our gh actions reference the prez-lite repo actions? Can we develop a simple example in the prez-lite repo that can not only test the functionality, but also be used as a template or basis for organisations to use?
 