
Issue: blank nodes don't allow you to edit children. Just shows the blank node ids. Add an example vocab that demonstrates the issue, using qualified attribution / agent.

Here's an example of a vocpub validator

https://github.com/Geological-Survey-of-Western-Australia/Vocabularies/blob/main/validation/vocpub.ttl

i'm assuming we should run through a vocpub validator when we run data processing, and in the browser when we save changes to a vocab.

assess how this integration might work, if it fails it'd be nice to show an indicator on the vocab page to say it's not valid, maybe a human readable type of error as to why, ability to view full message, and links to any documentation.


Test driven development approach to our features.
- look at our /sprint skill and update the workflow to include to use test driven development approach.
- save the updated skill
- review our existing features, and make sure we have test coverage. i'd like to know when we change something, we can catch errors early.
- review our existing tests, and make sure they are up to date.

Incremental data deployments
- look at our data deployment process, and see if we can make it more incremental. e.g. it should detect if a vocab has changed, and only deploy / rebuild the data for that vocab. any related list assets or search would need to be rebuilt too, so overall we are consistent

Whos editing feature, and whos online.
- similar to the way google docs works, when you are logged in and viewing or editing a vocab page, it should show who is online and editing the same vocab.
- could show a little round avatar icon next to the users name, with a tooltip to show what they are editing.
- this needs a realtime message system, so when you edit it should push a small message to the server for this domain for this vocab, which the server would broadcast to all other clients of the same github repo. 
- assess which approach might be best, is there something available in cf that we can use already, supabase? might be good since cf already has auth.

Edit flow:
- Have a think about how we can make the edit flow make sense from not only an application lifecycle but data lifecycle perspective.
- We need to be able to edit and prepare data for publishing in an environment we can test and see if it all works as expected.
- Separately, we need to be able to manage updates to the ui for our application, and be able to push that out. We would have a dev area to work in, i assume a branch, then we can merge it into main. But that merge should not trigger a data rebuild, or use the data from dev. So, we might need to go from main to dev, and then back to main. And, from main to staging, and then to production (main). 
- Applicationwise, we have our main prez-lite web application, this has our sample data, and this is base nuxt layer that other prez-lite projects will extend. Those prez-lite projects will have their own data, and their own variations of the ui through the extension. So, the data needs for this main prez-lite project are a bit different to the child prez-lite projects. Basically the data in this main prez-lite project just needs to plod along as assets in this application, data will be tested and changed locally, and also via the ui to test updates. Howver the prez-lite projects will mainly change their data through the ui, once stabilised it will be through that more formal staging to main lifecycle. The gh-templates folder will have the child prez-lite projects. So, that's the best place to look for a reference. 
