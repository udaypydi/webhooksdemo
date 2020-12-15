const express = require("express")
const bodyParser = require("body-parser")
const fetch = require('node-fetch');
const request = require('request');
const Hubspot = require('hubspot');
const Analytics = require("@rudderstack/rudder-sdk-node");
const client = new Analytics('1lMWZsS6PIYIgF6qJBG9NK4oPzH', 'https://hosted.rudderlabs.com/v1/batch'); 

const app = express()
const PORT = 3000

const accessTokenMapper = {};

const hubspot2 = new Hubspot({
  apiKey: 'f4b9be8f-d51b-45a1-9ce2-0002c9b47628',
  checkLimit: false // (Optional) Specify whether to check the API limit on each call. Default: true
});

app.use(express.static('public/'));


app.use(bodyParser.json());

app.post("/hook", (req, res) => {
	const data={};
    data.tenantId=req.body[0].portalId;
	hubspot2.contacts
	.get()
	.then(results => { //console.log(results);
		data.contacts=results;
		console.log(data);
		client.track({
		
			event: JSON.stringify(data.tenantId),
			userId: JSON.stringify(results),
		});
		client.track({
			event: "Contacts-hub2",
			userId: req.body[0].eventId,
		})
	})
	.catch(err => {
		console.error(err)
	});
  
  res.status(200).end()
});

app.get('/redirect', (req, res) => {
 const { code } = req.query;
  const formData = {
    grant_type: 'authorization_code',
    client_id: '13e6b8fd-d6f3-4e19-b8f8-d29401aa5378',
    client_secret: 'ab6e5fb2-47bf-4da1-8a5c-54b401f594f0',
    redirect_uri: 'https://multitenancyhubs.loca.lt/redirect',
    code,
  };

  request.post('https://api.hubapi.com/oauth/v1/token', { form: formData }, (err, data) => {
	const { access_token, refresh_token } = JSON.parse(data.body);
    request.get('https://api.hubapi.com/integrations/v1/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      }, (error, response) => {
          console.log(response);
    });
     res.json(data);
  });
})
app.get('/test-url', (req, res) => {
    res.json({ message: 'Hello world!' });
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`))