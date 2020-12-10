// Require express and body-parser
const express = require("express")
const bodyParser = require("body-parser")
const Hubspot = require('hubspot');
const fetch = require('node-fetch');
const request = require('request');
const Analytics = require("@rudderstack/rudder-sdk-node");
const client = new Analytics('1lMfTFy6PGyH3eyfDfFIqfBmhEw', 'https://hosted.rudderlabs.com/v1/batch'); 

const app = express()
const PORT = 3000


app.use(express.static('public/'));

const hubspot = new Hubspot({
  apiKey: '1ce1e7af-61e7-4a18-b10d-bf20f3f345e3',
  checkLimit: false // (Optional) Specify whether to check the API limit on each call. Default: true
});

app.use(bodyParser.json());

app.post("/hook", (req, res) => {
  console.log(req.body);
hubspot.contacts
  .get()
  .then(results => {
    client.track({
        event: "Contacts",
        userId: JSON.stringify(results),
    });
    client.track({
        event: "Contact Created",
        userId: req.body[0].eventId,
    })
  })
  .catch(err => {
    console.error(err)
  })
  res.status(200).end()
});

app.get('/redirect', (req, res) => {
  const { code } = req.query;
  const formData = {
    grant_type: 'authorization_code',
    client_id: '38f48ac4-1ea1-4827-adbb-6e137cb98ab6',
    client_secret: '98500fe9-6154-4879-92bd-73fa83148a0e',
    redirect_uri: 'https://serious-walrus-46.loca.lt/redirect',
    code: req.query.code
  };

  request.post('https://api.hubapi.com/oauth/v1/token', { form: formData }, (err, data) => {
    // Handle the returned tokens
    console.log(data);
     res.json(data);
  }
})

app.get('/test-url', (req, res) => {
    res.json({ message: 'You are my world!' });
});


app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))