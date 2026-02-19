# Idea Share

How to share your vocabularies with the world.

Proposal is to have a number of ways to share your vocabularies for use in other applications. Since prez-lite is a static site, it is limited to sharing assets that are statically bundled. However, we still have some useful options.

In addition to these options, we should have a share page on the site that is dedicated to sharing an individual vocabulary. It should show the different formats available for the vocabulary, and provide links to download the files. It should also provide a link to the web component code, and a link to the json file.

The share page should list all of the sharable vocabularies and provide a link to the share page for each vocabulary.

Should be explanatory and easy to understand for technical and non-technical users.

Option 1: Machine Readable Vocabularies
 - For each vocabulary, we can generate a machine readable vocabulary in ANON+TTL, TTL, JSON, JSON-LD, RDF/XML and CSV format.
 - These files will be generated at build time and bundled with the static site in the public/export/vocabs/<vocab-name - from ttl file-name>/ directory.
 - The files will be named as follows:
   - <vocab-name>-anon+ttl.ttl
   - <vocab-name>-ttl.ttl
   - <vocab-name>-json.json
   - <vocab-name>-json-ld.json
   - <vocab-name>-rdf.xml
   - <vocab-name>-csv.csv

Option 2: Web components
 - We can create a web component that can be used to display the vocabulary in a web page.
 - A web component is a self contained component that can be used in a web page.
 - We will have a prebundled set of base web components that can show a vocabulary as a tree, list, searchable list, radio button list, dropdown list, etc.
 - To use a web component, the user would need to include the web component in their web page, and then use the web component to display the vocabulary.
 - The web components should be prebundled with the static site and built as part of the build process. They should be available in the public/web-components directory. The should be performant and optimised as much as possible. For simplicity we can use nuxt ui v4 components for the web components, if that is performant enough.
 - If we can make this component usable for other frameworks, then we should do so, and provide a link to the framework specific code. E.g. React, Vue, Angular, etc.

 **As an example to show a list of alteration types:**
   - The build process would generate the json file (/export/vocabs/alteration-types/alteration-types.json)
   - The user would then include the web component in their web page, and then use the web component to display the vocabulary by passing the json file to the web component.

**Basic example:**
This example will use the default json file location and vocab name provided.

```html
<script src="<your-site-url>/web-components"></script>
<prez-lite-vocab-list vocab="alteration-types" />
```

**Example with a custom json file location :**
```html
<script src="<your-site-url>/web-components"></script>
<prez-lite-vocab-list 
    vocab-url="https://example.com/export/vocabs/alteration-types/alteration-types.json" />
```

**Base attributes provided for select list:**
- vocab = the name of the vocab to display
- vocab-url = the url of the json file to display (only if vocab is not provided)
- list-type = the type of list to display, e.g. list, tree, select, radio, dropdown, etc.  (or are we better off having a different component for each type?)
- multiple = whether to allow multiple selections
- search
- selected-id = the id of the selected node
- selected-ids = the ids of the selected nodes
- sort = whether to sort the list by a property
- sort-order = the order to sort the list by, e.g. asc, desc

**Tree attributes:**
- expand-all = whether to expand all nodes by default

**Methods:**
- get-selected-ids = returns the ids of the selected nodes
- get-selected-values = returns the values of the selected nodes
- get-selected-labels = returns the labels of the selected nodes
- get-selected-items = returns the items of the selected nodes
- get-selected-items-by-id = returns the items of the selected nodes by id
- get-selected-items-by-value = returns the items of the selected nodes by value
- get-selected-items-by-label = returns the items of the selected nodes by label

**Events:**
- select = fires when a node is selected
- deselect = fires when a node is deselected
- change = fires when the selected nodes change
- sort = fires when the list is sorted
- search = fires when the search input is changed
