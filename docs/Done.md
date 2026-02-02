# Completed Features

## Content pages

- [x] Add the ability to add content pages to the site.
- [x] Use nuxt content to manage the content pages.
- [x] Use the nuxt content skills to help with the content pages.
- [x] Should be able to use markdown files to create the content pages.
- [x] Markdown files should support nuxt content markdown components.
- [x] Markdown files should support mermaid diagrams.
- [x] Add home page and about page to the site, vocabularies can be an option in the navigation

## UI

- [x] Change from the current green theme to a nicer modern blue theme.
- [x] Should use a government style font, have a place for a logo in the banner area, and a footer
- [x] UI should be customisable, so can be used for other gov sites.
- [x] Prefereably should be templatable in a way, so can be flexible how you construct the site.
- [x] Make our pages be dummer, e.g. the loading content logic should be in a composable, this makes our pages easier for someone to override.

## Concept layout

- [x] IRI should be near the top, under the heading
- [x] Properties table should be on the right hand side - as there are many properties to scroll through
- [x] In scheme, broader, narrower should be on the left hand side, as they are the main relationships

## Vocab

- [x] Concepts should be under the description
- [x] Concepts need a + - button or dropdown button to show expanded children, not clear what has a child at the moment
- [x] Concepts need an expand/collapse all option.
- [x] Concepts need a search option

## Vocab list

- [x] Vocab list needs a search option, and sorting capabilities
- [x] Vocab list needs a pagination option

## Search

- [x] Need a dedicated search page, with a search input, and a search button (should look more google style like)
- [x] Search should search across all vocabs, concepts and properties
- [x] Search results list should show the concept name, description, and a link to the concept page, or name of vocab, or property name.
- [x] Think carefully how to show these different types of information
- [x] Add a vocab filter to the search results, so can filter by vocab.
- [x] Add any other filters that are needed, e.g. property type, concept type, etc.
- [x] Add pagination
- [x] Fix 500 error (searchInput.value?.focus is not a function)

## Navigation

- [x] Navigation menu visible on smaller screens (removed hidden class)

## Vocab (Scheme Page)

- [x] IRI displayed under title
- [x] Description clamped to 8 lines with "Show more" button when needed
- [x] Concepts displayed under description with tree view

## Vocab List

- [x] Pagination working correctly with items-per-page dropdown
- [x] Column header sorting with sort direction indicators

## Concept Page

- [x] Multivalue properties grouped in single rows instead of separate rows

## Theme

- [x] Blue primary color via CSS variable overrides

## Vocab List (continued)

- [x] No match message when search doesn't find vocabularies
- [x] Entire card clickable with hover highlight and pointer cursor

## Scheme Page (continued)

- [x] Concepts section moved above History section
- [x] Inline concept panel when clicking concept in tree
- [x] URL updates to ?uri=<vocab>&concept=<conceptIri> without page reload
- [x] Clicking concept title in panel navigates to full concept page

## Search Page (continued)

- [x] Query syncs to URL as ?q=<term> for shareable links
- [x] Multi-select vocabulary filter
- [x] Faceted sidebar showing vocabulary counts when results span multiple vocabs
- [x] Clear filter buttons
