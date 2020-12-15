const express = require("express")
const bodyParser = require("body-parser");
const pg = require('pg');
const fetch = require('node-fetch');
const request = require('request');
const Hubspot = require('hubspot');
const Analytics = require("@rudderstack/rudder-sdk-node");
const client = new Analytics('1lMfTFy6PGyH3eyfDfFIqfBmhEw', 'https://hosted.rudderlabs.com/v1/batch'); 

const app = express()
const PORT = 3000

const accessTokenMapper = {};

/**
 * 
 * Elephant SQL Configuration
 */

const conString = "postgres://tiusgomj:lRo62qx0CSEJR_EVss6tIiALeKr5CIg1@suleiman.db.elephantsql.com:5432/tiusgomj" //Can be found in the Details page
const pgClient = new pg.Client(conString);

app.use(express.static('public/'));


app.use(bodyParser.json());

app.post("/hook", (req, res) => {
	const data={};
  data.tenantId = req.body[0].portalId;
  let access_token;
  let refresh_token;
  
  const fetchQuery = `SELECT * FROM "public"."hubspotusers" WHERE portal_id = '${data.tenantId}';`;

  pgClient.query(fetchQuery, function(err, result) {
    if(err) {
      return console.error('error running query', err);
    }
    access_token = result.rows[0].access_token;
    refresh_token = result.rows[0].refresh_token;

    if (access_token && refresh_token) {
      fetchAllContacts(access_token, data.tenantId);
      res.status(200).end()
    } else {
      res.json({ message: 'access token not found' });
    }
  });


});

/**
 * Redirect URL - Hubspot Authentication
 */

pgClient.connect(function(err) {
  console.log('connection successfull');
});

function fetchAllContacts(accessToken, portalId) {
  const hubspot = new Hubspot({
    accessToken,
  });

  const deleteCmd = `DELETE FROM hubcontacts WHERE tenant_id='${portalId}';`;
  
  pgClient.query(deleteCmd, function(err, result) {
    if(err) {
      return console.error('error running insert query', err);
    }
    hubspot.contacts
    .get()
    .then(results => { 
      results.contacts.forEach(result => {
        const data = {
          first_name: result.properties.firstname.value,
          last_name: result.properties.lastname.value,
          profile_url: result['profile-url'],
          vid: result.vid
        };
        
        const text = 'INSERT INTO hubcontacts(tenant_id, first_name, last_name, profile_url, vid) VALUES($1, $2, $3, $4, $5)';
        const values = [portalId, data.first_name, data.last_name, data.profile_url, data.vid];
        
        pgClient.query(text, values, function(err, result) {
          if(err) {
            return console.error('error running insert query', err);
          }
          console.log('insert query', result.rows[0]);
          
        });
      })
    })
    .catch(err => {
      console.error(err)
    });
  });
}


app.get('/redirect', (req, res) => {
 const { code } = req.query;
  const formData = {
    grant_type: 'authorization_code',
    client_id: '38f48ac4-1ea1-4827-adbb-6e137cb98ab6',
    client_secret: '98500fe9-6154-4879-92bd-73fa83148a0e',
    redirect_uri: 'https://hubspotsyncdemo.loca.lt/redirect',
    code,
  };

  request.post('https://api.hubapi.com/oauth/v1/token', { form: formData }, (err, data) => {
	const { access_token, refresh_token } = JSON.parse(data.body);
    request.get('https://api.hubapi.com/integrations/v1/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      }, async (error, response) => {
        const { portalId } = JSON.parse(response.body)

        accessTokenMapper[portalId] = {
          access_token,
          refresh_token,
        };

        const fetchQuery = `SELECT * FROM "public"."hubspotusers" WHERE portal_id = '${portalId}';`;
        
        pgClient.query(fetchQuery, function(err, result) {
          if(err) {
            return console.error('error running query', err);
          }
          if (result.rows[0]) {
            const updateCmd = `
              update hubspotusers 
              set access_token = '${access_token}', refresh_token = '${refresh_token}'
              where portal_id = '${portalId}'
            `;

            fetchAllContacts(access_token, portalId);
            
            pgClient.query(updateCmd, function(err, result) {
                if(err) {
                  return console.error('error running update query', err);
                }
                console.log('update query', result.rows[0]);
                // >> output: 2018-08-23T14:02:57.117Z
                // pgClient.end();
            });

          } else {
           
            const text = 'INSERT INTO hubspotusers(portal_id, access_token, refresh_token) VALUES($1, $2, $3)'
            const values = [portalId, access_token, refresh_token];

            fetchAllContacts(access_token, portalId);

            pgClient.query(text, values, function(err, result) {
                if(err) {
                  return console.error('error running insert query', err);
                }
                console.log('insert query', result.rows[0]);
                // >> output: 2018-08-23T14:02:57.117Z
                // pgClient.end();
            });
          }
        });

    });
     res.json(data);
  });
});


app.get('/test-url', (req, res) => {
    res.json({ message: 'Hello world!' });
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`))