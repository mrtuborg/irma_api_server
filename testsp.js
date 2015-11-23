var qrcode = require('qrcode-terminal');
var request = require('request');
var jwt = require('jsonwebtoken');
var fs = require('fs');

var sprequest = {
	"data": "foobar",
	"validity": 60,
	"request": {
		"content": [
			{
				"label": "Address",
				"attributes": ["IRMAWiki.member.email", "Surfnet.root.userID", "MijnOverheid.address.street"]
			},
			{
				"label": "Over 18",
				"attributes": ["MijnOverheid.ageLower.over16"]
			}
		]
	}
};

var server = process.argv[2] + "/irma_verification_server/api/v1/";
var publickey = fs.readFileSync('src/main/resources/pk.pem');
var result = null;

function poll(token) {
	var pollOptions = {
		uri: server + token + "/getproof",
		method: 'GET'
	};

	request(pollOptions, function (error, response, body) {
		process.stdout.write(".");

		try {
			var payload = jwt.verify(body, publickey, {algorithms: ["RS256"]});
			if (payload.status != "WAITING") {
				result = payload;
				console.log();
				console.log(body);
				console.log();
				console.log(result);

				if (payload.status != "VALID")
					throw "Proof was invalid";
				if (payload.sub != "disclosure_result")
					throw "Invalid subject";
			}
		} catch(err) {
			console.log("Token invalid: " + err.toString());
			console.log(body);
		}
	});
}

var options = {
	uri: server,
	method: 'POST',
	json: sprequest
};

request(options, function (error, response, body) {
	if (!error && response.statusCode == 200) {
		var qrcontent = body;
		var session = body.u;
		qrcontent.u = server + qrcontent.u;

		console.log(qrcontent);
		qrcode.generate(JSON.stringify(qrcontent));

		var check = function() {
			if (result == null) {
				poll(session);
				setTimeout(check, 1000);
			}
		};

		check();
	} else {
		console.log(error);
	}
});

