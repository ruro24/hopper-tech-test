# Hopper Tech Test

## Getting Started

Please refer to [coding-exercise.md](./coding-exercise.md) for the full problem description and instructions.

## Submitting your solution

Create you solution in a fork of this repository. Once you're ready to submit, please add dmanning-resilient as a collaborate on your private repository and send us a message.

## Candidate Notes

<!-- 
  Please update this section with details about your solution, including:
  - How to install dependencies and run your code (if applicable)
  - Any assumptions or trade-offs you made
  - Anything else you'd like the reviewer to know
-->

### How to run

``` npm i ``` 
NB you may need to remove the package-lock.json

```npm run start```

You can now curl the api with the filePath of the CSV record. This is a local file path. In real life, this could be the path to an object storage like S3, from which you could retreive the csv file to process. 

For example:
```bash
 curl -X POST http://localhost:3000/ -H "Content-Type: application/json"  -d '{"filePath": "examples/call-batch.csv"}'

```

You can find example CSV files in the examples folder.

### How to run tests

```npm run test```

### Assumptions

- I assumed that even if we cannot enrich the phone calls, we still want to store them. As such I made them return default values in the case of the failure. Potentially you could go back and enrich unsuccessful records at a later time.

### Trade Offs

- I didn't do any retries of the lookup. With 0.05% failure rate, and the requirements of 500ms, retries would significantly increase this response time. However I could have implemented a timeout, to allow more retries. In real life I might suggest sending validated batches to a seperate service that does the lookups, and retries. This would return after validation was successful. For example you could call lamda functions to concurrently to do lookups, and store that in a database. 


## Database options

Having done some research I might use PostGreSQL, potentially with timescaleDB extension. This would allow for strong consistancy, fast writes, and fast updates if you want to enrich data later instead. The timescaleDB allows fast time-based queries if required later. It also allows for complex queries, if for example, you were looking for patterns/aggregation to help detect fraud. 

Here I have just implemented a simple database manager that just stores the json in a log for visual purposes. 


