look at the code in the following projects:
- https://github.com/RDFLib/prez-ui
- https://github.com/RDFLib/prez
- https://github.com/Kurrawong/prezmanifest (vocab loader/sync)
- https://github.com/oxigraph/oxigraph
- https://github.com/AGLDWG/vocpub-profile
- https://github.com/Geological-Survey-of-Western-Australia/Vocabularies (example of a vocabulary repository)
- https://demo.dev.kurrawong.ai/

currently we use a combination of prez-ui/prez and fuseki to serve the vocabularies. separately we have a vocab github repo that contains
the vocabularies in ttl format.

as part of the github actions we run a script upload them to the fuseki server.

the proposal is to use oxigraph to serve the vocabs in js. and as part of github action we will install the prez-ui application,
and use deploy a new adapter that replaces the api composable in prez ui, that will use the oxigraph api to serve the vocabularies.
needs to be all able to run in a js runtime. 

ok, goal is to have an all in one self contained repo that will ideally has a github action that builds the application
and deploys to gh pages as a static site. so, either we do a standard prez-ui deployment with a smart adapter that uses the in mem js oxygraph 
style approach. or... it can run through a generation step, where it statically generates all of the html pages and then deploys to gh pages.

also, if any adapter or specialised code, e.g. new prez-ui style site in a static site setup, then this could just be put in this repo
to begin with, so we can iterate. i'm assuming prez-ui could be recreated as a simple prez-lite version that is a simple nuxt app that 
uses nuxt generate to create the static pages, as an option too. so, assess the two different approaches. the full prez-ui app has 3 different
packages, components, lib and ui. if this is distilled into a simple nuxt app, then we can just include into the one prez-lite nuxt app.

a note, the search functionality could use a static resource, e.g. json, if we created static pages, this could be used to generate
search results.

the end goal, after we work out the approach and play in this repo, will be to create the new prez-lite app or adapter that is needed,
then any repo that needs simple vocabs can just create an action that installs the prez-lite app or adapter with prez-ui, and then uses it to serve the vocabs.
