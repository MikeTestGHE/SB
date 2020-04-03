/* eslint-disable indent */
/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 */
'use strict';
var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests

/**********************************************************************
 *  Variables for zos-node-accessor module 
 **********************************************************************/
var fs = require('fs');
var path = require('path');
var Q = require('q');
var Client = require('zos-node-accessor');


var passwordFilePath = "./lib/WCBUSER_pw.txt";
const USERNAME = 'WCBUSER';
var PASSWD = fs.readFileSync(passwordFilePath, 'utf8').trim();

// const USERNAME = process.env.WCBUSER_NAME || null;
// const PASSWD = process.env.WCBUSER_PW || null;

// var HOST 		= 'SSGMES2.tuc.stglabs.ibm.com'

var MAX_QUERIES = 10;          	// Query 10 times at most
var QUERY_INTERVAL = 2000;     	// 2 seconds
var client = new Client();

// QueryUserMods("UA97849");

// call QueryUmod action, call done with (error, result data)
function QueryUserMods(HOST, sysmodName, callback) {
	// var sysmodName = queryUmodfAction.parameters.usermodName.toUpperCase();
	// var HOST = queryUmodfAction.parameters.systemIP;

	// var UserTsoID = queryUmodfAction.parameters.userName;

	var JCLjob = QrySysmodCurrent(sysmodName, USERNAME);
	console.log(sysmodName + 'sysmodName ++++++++++++++++++++++++++++++++++++++++++++++++++++');
	console.log(HOST + ' HOST +++++++++++++++++++++++++++++++++++++++++++++');
	client.connect({ user: USERNAME, password: PASSWD, host: HOST })
		.then(function (client) {
			if (client.connected) {
				console.log('Connected to...', HOST);
				return client;
			} else {
				console.log('Failed to connect to', HOST);
			}
			return Q.reject('Failed to connect to', HOST);
		});

	return SubmitQueryUsermod(client, JCLjob, callback);
}	// end: QueryUserMods


function SubmitQueryUsermod(client, JCLjob, callback) {

	submitJob(client, JCLjob).then(function (result) {

		console.log('SubmitQueryUsermod: ' + result.jobName + ' JobID...' + result.jobId);

		client.getJobLog(result.jobName, result.jobId, 'x')
			.then(function (jobLog) {
				console.log('getJobLog: Job log output:' + jobLog);
				client.close();
				console.log('<=======================CLOSE CONNECTION=========================>');
				callback(null, parsing(jobLog));

			});
	}).catch(function (err) {
		console.log('QueryUserModsa(queryUmodfAction): returned an error');
		console.dir(err);
		callback(JSON.stringify(err.jobLog));
	});
}

/***********************************************************************
 * Functions
 ***********************************************************************/
function submitJob(client, job) {
	var jcl = job.jcl;
	return client.submitJCL(jcl)
		.then(function (jobId) {
			console.log('Submitted: ', job.jobName, jobId);
			var deferred = Q.defer();
			setTimeout(function () {
				pollJCLJobStatus(deferred, client, job.jobName, jobId, MAX_QUERIES);
			}, QUERY_INTERVAL);
			return deferred.promise;
		});
}

function pollJCLJobStatus(deferred, client, jobName, jobId, timeOutCount) {
	if (timeOutCount === 0) {
		console.log('SetTimeout=0 now...');
		deferred.resolve(Client.RC_FAIL);
	}
	client.queryJob(jobName, jobId)
		.then(function (rc) {
			console.log(jobId, rc);		// JOBxxxxx Success or Failing
			if (rc === Client.RC_SUCCESS || rc === Client.RC_FAIL) {
				if (rc == Client.RC_SUCCESS) {
					console.log('pollJCLJobStatus->RC:' + rc);
				}
				deferred.resolve({ jobName: jobName, jobId: jobId, rc: rc });

			} else {
				setTimeout(function () {
					pollJCLJobStatus(deferred, client, jobName, jobId, timeOutCount - 1);
				}, QUERY_INTERVAL);
			}
		});
}

function QrySysmodCurrent(sysmodname, USERNAME) {

	if ((sysmodname.substring(0, 1) == 'A') ||
		(sysmodname.substring(0, 1) == 'B') ||
		(sysmodname.substring(0, 1) == 'C') ||
		(sysmodname.substring(0, 1) == 'D') ||
		(sysmodname.substring(0, 1) == 'E') ||
		(sysmodname.substring(0, 1) == 'U')) {
		var jcl = fs.readFileSync(path.join(__dirname, '/lib/JCL/QRYSYMOD1.jcl'), 'utf8');
		jcl = jcl.replace('__QRYSYMOD__', sysmodname + 'Q');
		jcl = jcl.replace('__MSGCLASS__', 'H');
		jcl = jcl.replace('__SYSMODNAME__', sysmodname);
		jcl = jcl.replace('__USERID__', USERNAME);
		// jcl = jcl.replace('__WUSER__', UserTsoID);
		jcl = jcl.replace('__JOBNAME__', sysmodname + 'Q');

		return { jobName: sysmodname + 'Q', jcl: jcl };
	}
	else {
		var sysmodnum = sysmodname.substring(2);
		var jcl = fs.readFileSync(path.join(__dirname, '/lib/JCL/LISTAPAR.jcl'), 'utf8');
		jcl = jcl.replace(/__SYSMODNUM__/g, sysmodnum);
		jcl = jcl.replace('__USERID__', USERNAME);
		jcl = jcl.replace('__JOBNAME__', 'LISTAPAR');
		// jcl = jcl.replace(/__WUSER__/g, UserTsoID);
		// jcl = jcl.replace(/__PREFIX2__/g, sysmodname.substring(1, 1)+'');
		return { jobName: 'LISTAPAR', jcl: jcl };
	}
}

// function parsing(jobString) {
// 	console.log('jobString------ ', jobString);
// 	return 'Trinh';
// }
function parsing(jobString) {
	var linesArray = jobString.split(/\r?\n/);
	for (var i = 0; i < linesArray.length; i++) {
		//console.log("Inside parsing step ----- " + linesArray[i]);
	}

	var lineOutput = [];
	for (var i = 0; i < linesArray.length; i++) {
		// Case that the sysmod has been installed in the system
		if (linesArray[i].indexOf('TYPE            =') >= 0) {
			while (linesArray[i].indexOf('NOW SET TO GLOBAL ZONE') < 0) {
				//console.log("Pushed to output ++++++++ " + linesArray[i]);
				lineOutput.push(linesArray[i]);
				i++;
			}
		}

		// Case that we list the sysmods' status in the system
		if (linesArray[i].indexOf('List result of usermods/APARs:') >= 0) {
			while (linesArray[i].indexOf('End of result list of usermods/APARs') < 0) {
				//console.log("Pushed to output ++++++++ " + linesArray[i]);
				lineOutput.push(linesArray[i]);
				i++;
			}
		}

		// Case that the sysmod has not been installed in the system
		if (linesArray[i].indexOf('NOT FOUND') >= 0) {
			//console.log("Pushed to output ++++++++ " + linesArray[i]);
			lineOutput.push(linesArray[i]);
		}

	}
	var textResult = lineOutput.join('\n');

	return textResult;
}

module.exports.QueryUserMods = QueryUserMods;
