/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 */
'use strict';
var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests

/**********************************************************************
 *  Variables for zos-node-accessor module 
 **********************************************************************/
var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');
var sinon = require('sinon');
var Q = require('q');
var Client = require('zos-node-accessor');

var PWfilePath = "./lib/WCBUSER_pw.txt";
var USERNAME = 'WCBUSER';
var PASSWD = fs.readFileSync(PWfilePath, 'utf8').trim();
// var HOST 		= 'SSGMES2.tuc.stglabs.ibm.com'

var MAX_QUERIES = 30;          	// Query 10 times at most
var QUERY_INTERVAL = 2000;     	// 2 seconds
var client = new Client();

function DsfCommand(HOST, cmd, callback) {
	console.log(cmd + ' cmd +++++++++++++++++++++++++++++++++++++++++++++');
	console.log(HOST + 'HOST+++++++++++++++++++++++++++++++++++++++++++++');

	var JCLjob = DSFcommandCurrent(cmd);
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

	return SubmitDSFcommandJob(client, JCLjob, callback);
}	// end: DsfCommandToNative


function SubmitDSFcommandJob(client, JCLjob, callback) {

	submitJob(client, JCLjob).then(function (result) {

		console.log('SubmitDSFcommandJob: ' + result.jobName + ' JobID...' + result.jobId);

		client.getJobLog(result.jobName, result.jobId, '4')
			.then(function (jobLog) {
				console.log('getJobLog: Job log output:' + jobLog);
				client.close();
				console.log('<=======================CLOSE CONNECTION=========================>');
				callback(null, parsing(jobLog));

			})
	}).catch(function (err) {
		console.log('DSFcommandToNativeSysa(DSFcommandAction): returned an error');
		console.dir(error);
		callback(JSON.stringify(error.jobLog));
	});
}

/***********************************************************************
 * Functions
 ***********************************************************************/
function submitJob(client, job) {
	var jcl = job.jcl;
	return client.submitJCL(jcl)
		.then(function (jobId) {
			console.log('DsfCommand Submitted: ', job.jobName, jobId);
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

function DSFcommandCurrent(cmd) {
	var jcl = fs.readFileSync(path.join(__dirname, '/lib/JCL/DSFCOMMAND.jcl'), 'utf8');
	jcl = jcl.replace('__DSFCMD__', cmd);
	return { jobName: 'DSFCMDW', jcl: jcl };
}

function parsing(jobString) {
	var textResult = '';
	var linesArray = jobString.split(/\r?\n/);
	for (var i = 0; i < linesArray.length; i++) {
		// console.log("Inside parsing step ----- " + linesArray[i]);
		linesArray[i] = linesArray[i].replace(/\s/g, '\xa0');
	}
	if (jobString.indexOf('COMMAND INVALID') >= 0) {
		textResult = 'This is an invalid DSF command.';
	}
	else {
		linesArray.splice(0, 2);
		textResult = linesArray.join('\n');
	}

	return textResult;
}
module.exports.DsfCommand = DsfCommand;