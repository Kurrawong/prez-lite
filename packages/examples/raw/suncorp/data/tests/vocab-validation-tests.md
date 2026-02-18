## Vocab Validation Tests

The file ../vocabs/ANZSIC.ttl is valid according to the SHACL validator in ../validators/vocabs.ttl

We need several variants of that vocab file in this folder that fail validation in several different ways. 

The files should be named:

* ANZSIC-invalid-01.ttl
* ANZSIC-invalid-02.ttl

etc.

They need a comment in the Turtle RDF file at the top telling us how they are invalid, then they need to be invalid in that way. The files should each only be invalid in 1 way.

the ways they should be invalid are:

1. a new Concept has been added, but it's missing a schema:creator value
2. a new Concept has been created that replaces an existing concept but the replaced concept's schema:endTime hasn't been set to be the schema:startTime of the replacing concept
3. a Concept has been added to a vocab but the vocab's schema:dateModified hasn't been updated to the date of the addition

