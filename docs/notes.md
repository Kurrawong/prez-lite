

Can you please create an admin application that does the following:


1.  displays vocabs

1.  as shown yesterday but simpler, as per model below

3.  allows vocabs to be edited via forms

1.  uses the simplified vocab model below

5.  reads and writes files in Git

1.  It's confirmed that the total data size is easily small enough for all editing to be done via Git files, even in later stages with non-vocab objects

7.  is part of an overall application to manage multiple kinds of objects in a "database" 

1.  other classes of object are below 
2.  the menu access to view or edit them should be greyed out for now

1.  we will enable these later


The immediate task is a pilot one with all the other object editing functions to be added after we start real work.

Data Model
This is as per DC's messages via Signal:

The purpose of this V1 is for Suncorp to be able to extend the ANZIC2006 Bureau of Stats' industry codes (https://github.com/geological-survey-of-queensland/vocabularies/blob/master/vocabularies-gsq/ANZIC2006-industry-classifications.ttl) with their own specialisation. So they should see this vocab loaded and be able to edit it - adding new Concepts.


Under a "Vocabularies" button/tab, please make a list of vocabs, with options to add and remove new ones. Please pre-load with 2 vocabs - Suncorp's ANZSIC as below and another demo vocab of Brands, at attached.


The model for all vocabs should be, with examples for the new ANZSIC-derived vocab being:

Vocab:

-   label - "Suncorp's Extended ANZ Standard Industrial Classification 2006"
-   definition - "Suncorp's extended version of the Australian and New Zealand Standard Industrial Classification 2006 - Codes and Titles"
-   modified date - automatically generated from last edit



Concept:

-   label (prefLabel)

-   alternate label (altLabel)
-   definition
-   notation

-   no fancy multiple datatypes, just the one notation per concept for now

-   parent (skos:broader)

-   can be multi-select, with a Concept selector for the value(s)

-   provenance

-   "was derived from" or "was revision of" with a Concept selector for the value
-   we don't need the "specialisation of" DC indicated - that's a synonym for broader!

-   modified by

-   text entry for now
-   auto using details of person logged in, in v2

-   modified date - auto from last edit
-   start date & end date

-   with start date defaulting to creating date of vocab

-   version ID 

-   auto increment from edit


Other classes of object


Just make these greyed out menu items for now.


-   Product Definition
-   Vehicle Type
-   Event



So just create 3 buttons/tabs etc for these and we will get details from DC. Probably just the named buttons/tabs with a hover tooltip definition is enough for them to understand "that's where other things you know about will be"!


I will send you a SHACL validator for the above model shortly and a starting point version of the Suncorp ANZSIC vocab and the brands one: basically the two attached vocabs with stuff we don't need stripped out and valid according to the validator.


