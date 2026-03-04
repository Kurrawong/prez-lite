# Changelog

## [0.2.0](https://github.com/Kurrawong/prez-lite/compare/prez-lite-v0.1.0...prez-lite-v0.2.0) (2026-03-04)


### Features

* add test vocabularies (colours, project-status, australian-states) ([ab35592](https://github.com/Kurrawong/prez-lite/commit/ab355925c53ad4939690f452f80df5271c5aa2e4))
* blank node editing, nested validation, and profile-driven constraints ([#15](https://github.com/Kurrawong/prez-lite/issues/15)) ([51d8582](https://github.com/Kurrawong/prez-lite/commit/51d85823dd792208045befdf9fc40eac6feed704))
* layered status bar with branch/staging change visibility ([5ae62f5](https://github.com/Kurrawong/prez-lite/commit/5ae62f5b4c2386bd27530d09e07f45da18297075))
* PR review workflow with submit, approve, reject, and branch cleanup ([fa6341c](https://github.com/Kurrawong/prez-lite/commit/fa6341cc4f7de04e5dd955ee68b149edb951b64b))
* prez-lite - lightweight SKOS vocabulary browser ([28bfed6](https://github.com/Kurrawong/prez-lite/commit/28bfed6f8824f984c7220cbd5997a015936946a8))
* profile-driven rendering with sh:node support and UI enhancements ([a4f108d](https://github.com/Kurrawong/prez-lite/commit/a4f108dc41d56ee79ee867ee3d4d02af8675351b))
* profile-driven simple/expert view modes with prez:simpleView annotation ([d87bfe8](https://github.com/Kurrawong/prez-lite/commit/d87bfe88d2f8104f06f57e1b71ae3c4954ba0fcd))
* staging change indicators in form, merge cleanup, and reload fix ([10478a2](https://github.com/Kurrawong/prez-lite/commit/10478a28df65af49d21d8087328da2e35c46d7ba))
* structured workspace system with per-vocab branches ([c8357a0](https://github.com/Kurrawong/prez-lite/commit/c8357a054e61f567f8c9984d279e96d9118ba6b5))
* support site-layer breadcrumbs and app config ([6fc0ca0](https://github.com/Kurrawong/prez-lite/commit/6fc0ca04bf3e782a58cdef56ef868b98184fc5a1))
* workspace dashboard with promotion actions and context-aware staging indicator ([231b42d](https://github.com/Kurrawong/prez-lite/commit/231b42dbefb5cc1e42de27b14a24bf00d23a61cf))


### Bug Fixes

* add GitHub OAuth env vars for e2e edit flow tests ([567ad47](https://github.com/Kurrawong/prez-lite/commit/567ad473ecdfd9f9aaacda45ddb36b244cae3f78))
* add nuxt prepare step to integration test CI job ([de6b694](https://github.com/Kurrawong/prez-lite/commit/de6b6946f5ae8703fe826219ea06dfb0df36013c))
* add prez-lite dev origin to auth worker allowed origins ([a420fc2](https://github.com/Kurrawong/prez-lite/commit/a420fc22e37b1c898de1af8801feb1546371d8f3))
* add suncorp dev origin to auth worker allowed origins ([e88d800](https://github.com/Kurrawong/prez-lite/commit/e88d80093cabf37e79294f19045e616c834304a5))
* add vocab data build and nuxt prepare to E2E test CI job ([f707fd8](https://github.com/Kurrawong/prez-lite/commit/f707fd84f73002eb9859da9ea389a987fa1653c7))
* add workspaces generation to reusable deploy and process-data workflows ([9018f60](https://github.com/Kurrawong/prez-lite/commit/9018f60f72c972dbbc166abc4b33daa33e1cd1bf))
* align prez-lite deploy-aws to use GH_REPO variable name ([b98aa6a](https://github.com/Kurrawong/prez-lite/commit/b98aa6a33974f61b9ff59d5991ea0e1c856d47a7))
* allow rejecting conflicted staging PR and delete branch on reject ([91186ec](https://github.com/Kurrawong/prez-lite/commit/91186ecc8851ae523395bb5c5d099002ccd05e9e))
* docs and UI improvements for issues [#3](https://github.com/Kurrawong/prez-lite/issues/3), [#4](https://github.com/Kurrawong/prez-lite/issues/4), [#8](https://github.com/Kurrawong/prez-lite/issues/8), [#12](https://github.com/Kurrawong/prez-lite/issues/12) ([a8f5d4f](https://github.com/Kurrawong/prez-lite/commit/a8f5d4f1075d0eefb4c6c954c1c69cc2237298b8))
* docs, UI improvements, and CI fixes ([#3](https://github.com/Kurrawong/prez-lite/issues/3), [#4](https://github.com/Kurrawong/prez-lite/issues/4), [#8](https://github.com/Kurrawong/prez-lite/issues/8), [#12](https://github.com/Kurrawong/prez-lite/issues/12)) ([16fcae4](https://github.com/Kurrawong/prez-lite/commit/16fcae4e17ff9b5ecec8ece62e0aef805246b119))
* increase Node.js heap size for Nuxt builds ([5eecc92](https://github.com/Kurrawong/prez-lite/commit/5eecc927ac74b3af8e4075c3c17d71d31c32c3a1))
* make CI tests resilient to missing validator shapes ([754070e](https://github.com/Kurrawong/prez-lite/commit/754070e0e52f2f4f6960fd5d9820d3b913dfa66f))
* make workspace generation conditional on script existence ([0a6f997](https://github.com/Kurrawong/prez-lite/commit/0a6f997e355aed156530da9664269521cc161c83))
* pass all GitHub env vars (repo, vocab path) in AWS deploy workflow ([2341c4a](https://github.com/Kurrawong/prez-lite/commit/2341c4adb39c984129fc72b6b6ec9c172b2943ad))
* pass changed vocabs to ReviewModal so submit button is enabled ([345037e](https://github.com/Kurrawong/prez-lite/commit/345037e909bc5a083c5e021322a2d3b391d32b04))
* pass GH_BRANCH env var in AWS deploy workflow ([c0f983e](https://github.com/Kurrawong/prez-lite/commit/c0f983edf73e73bd8eefc732a77a7f8718a3c649))
* pass GitHub OAuth env vars in reusable AWS deploy workflow ([74bf5e1](https://github.com/Kurrawong/prez-lite/commit/74bf5e1c9b15a8e676018c21527ac21be6a9fe55))
* pass NUXT_PUBLIC_GITHUB_REPO env var in AWS deploy workflow ([03ad555](https://github.com/Kurrawong/prez-lite/commit/03ad55590e01f7bae2487728af4eb67f5b54bffd))
* prevent EditToolbar from rendering in error states ([975dc5f](https://github.com/Kurrawong/prez-lite/commit/975dc5f320fed157664cbfaa8e9bf3b98c361611))
* remove accidentally tracked symlink ([6b5bd2d](https://github.com/Kurrawong/prez-lite/commit/6b5bd2d821c1afad90f7466b0cd78ae5cb98c171))
* rename GH_REPO_SLUG to GH_REPO for consistency ([d98dcf2](https://github.com/Kurrawong/prez-lite/commit/d98dcf226eea3a08f38073211c2823b0b6d8a223))
* set GitHub env vars in Playwright config for edit e2e tests ([3f1d37f](https://github.com/Kurrawong/prez-lite/commit/3f1d37f054a4dae3683bc7dfcb538d4dcb0e3196))
* simplify reject flow and delete branch on reject ([3166139](https://github.com/Kurrawong/prez-lite/commit/3166139ee34fa0e220d59f08bbf1ac5f26844616))
* skip test fixtures when validators/tests dir does not exist ([0f58b8d](https://github.com/Kurrawong/prez-lite/commit/0f58b8def4972a59984dbbf98464fea1b33e8821))
* update HTML and RDF/XML for GSWA vocabulary output ([f717f1b](https://github.com/Kurrawong/prez-lite/commit/f717f1bd409e662a508846fbd39f1c2b3888d7e0))
