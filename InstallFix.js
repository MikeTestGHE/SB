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
// var HOST 		= 'SSGMES1.tuc.stglabs.ibm.com'

var MAX_QUERIES = 100;          	// Query 10 times at most
var QUERY_INTERVAL = 2000;     	// 2 seconds
var client = new Client();
var now = new Date();
var localDateTime = ("0" + (now.getMonth() + 1)).slice(-2) + "/" + ("0" + now.getDate()).slice(-2) + "/" + now.getFullYear();
var timeStamp = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds()) + " on " +
	pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + "-" + now.getFullYear();

function InstallUserMods(HOST, mesName, sysmodName, desc, reject, alt, emailFromUserInput, callback) {
	console.log('sysmodName ++++++++++++++++++++++++++++++++++++++++++++++++++++' + sysmodName);
	console.log('HOST +++++++++++++++++++++++++++++++++++++++++++++' + HOST);
	console.log('reject +++++++++++++++++++++++++++++++++++++++++++++' + reject);
	console.log('mesName +++++++++++++++++++++++++++++++++++++++++++++' + mesName);
	console.log('emailFromUserInput +++++++++++++++++++++++++++++++++++++++++++++' + emailFromUserInput);
	console.log('alt +++++++++++++++++++++++++++++++++++++++++++++' + alt);

	var descTrim = '';
	if (desc.length >= 50) { descTrim = desc.substring(0, 50); }
	else descTrim = desc;

	var descLong = sysmodName + 'S- ' + localDateTime + ' ++APAR ' + descTrim;

	var JCLjob = InstallFixCurrent(sysmodName, descTrim, reject, USERNAME, alt);
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

	return SubmitInstallFix(client, JCLjob, sysmodName, mesName, USERNAME, descLong, emailFromUserInput, alt, callback);
}	// end: InstallUserMods


function SubmitInstallFix(client, JCLjob, sysmodName, mesName, USERNAME, descLong, emailFromUserInput, alt, callback) {

	submitJob(client, JCLjob).then(function (result) {

		console.log('SubmitInstallFix: ' + result.jobName + ' JobID...' + result.jobId);

		client.getJobLog(result.jobName, result.jobId, 'x')
			.then(function (jobLog) {

				var content = parsing(jobLog, sysmodName).replace(/\n/g, '\n');
				var installSuccess = false;
				if (content.indexOf('installed successfully') >= 0) { installSuccess = true; }
				var contentArray = content.split(/\r?\n/);
				for (var i = 0; i < contentArray.length; i++) {
					if (contentArray[i].indexOf('Would you want') >= 0) {
						contentArray.splice(i, 1);
					}
				}
				content = contentArray.join('\n');
				console.log('content..........' + content);

				var JCLjobEmail = InstallEmailAdminCurrent(sysmodName, mesName, USERNAME, descLong, emailFromUserInput, alt, installSuccess, content);
				console.log('JCLjobEmail.jcl----------------');
				// console.log('JCLjobEmail.jcl' + JCLjobEmail.jcl);
				submitJob(client, JCLjobEmail).then(function () {
					client.close();
					console.log('<=======================CLOSE CONNECTION=========================>');
				});

				callback(null, parsing(jobLog, sysmodName));

			})
	}).catch(function (err) {
		console.log('InstallUserModsa(installUmodAction): returned an error');
		callback(null, 'Installing job returned an error. Would you please check whether the command was valid and try again?');
		console.dir(error);
		// callback(JSON.stringify(error.jobLog));
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
			console.log(jobId, rc);
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



// function InstallFixCurrent(sysmodname, rnum) {
function InstallFixCurrent(sysmodname, desc, reject, USERNAME, alt) {
	// console.log("localDateTime:" + localDateTime);
	var volume;
	if (alt == 'ALT') { volume = '&SYSR2'; }
	else { volume = '&SYSR1' }
	var jcl = fs.readFileSync(path.join(__dirname, '/lib/JCL/INSTALL.jcl'), 'utf8');
	jcl = jcl.replace('__INSTASYMOD__', sysmodname + 'W');
	jcl = jcl.replace('__SYSMODNAME__', sysmodname);
	jcl = jcl.replace(/__DATE__/g, localDateTime);
	jcl = jcl.replace('__DESCRIPTION__', desc);
	jcl = jcl.replace('__USERID__', USERNAME);
	jcl = jcl.replace('__JOBNAME__', sysmodname + 'W');
	jcl = jcl.replace(/__VOL__/g, volume);
	if (reject == 'REJECT=YES') {
		jcl = jcl.replace('//SETREJCT SET REJECT=NO', '//SETREJCT SET ' + reject);
	}

	return { jobName: sysmodname + 'W', jcl: jcl };
}

function InstallEmailAdminCurrent(sysmodname, mesName, USERNAME, descLong, emailFromUserInput, alt, installSuccess, content) {
	var jcl = fs.readFileSync(path.join(__dirname, '/lib/JCL/EMAILINSTALLADMIN.jcl'), 'utf8');
	jcl = jcl.replace(/__USERID__/g, USERNAME);
	jcl = jcl.replace('__JOBNAME__', 'SMTPNOTE');
	jcl = jcl.replace('__CONTENT__', content);
	jcl = jcl.replace(/__USERMOD__/g, sysmodname);
	jcl = jcl.replace(/__MES__/g, mesName);
	// jcl = jcl.replace(/__DES__/g, descLong);
	jcl = jcl.replace(/__TIMESTAMP__/g, timeStamp);
	if (emailFromUserInput.indexOf('@') >= 0) {
		jcl = jcl.replace(/__EMAILUSER__/g, emailFromUserInput);
	}
	else {
		jcl = jcl.replace(/__EMAILUSER__/g, '');
	}
	if (alt == 'ALT') {
		jcl = jcl.replace(/__VOLINFO__/g, 'on the alternative volume');
	}
	else {
		jcl = jcl.replace(/__VOLINFO__/g, 'on the active volume');
	}
	if (installSuccess) {
		jcl = jcl.replace(/__BCUPDATE__/g, 'This description has been added to SYS1.PARMLIB(BDCTSYS):\n' + descLong);
	}
	else {
		jcl = jcl.replace(/__BCUPDATE__/g, '');
	}

	// 	This description has been added to SYS1.PARMLIB(BDCTSYS):
	// __DES__
	return { jobName: 'SMTPNOTE', jcl: jcl };
}

function parsing(jobString, sysmodName) {
	var lineOutput = [];
	var linesArray = jobString.split(/\r?\n/);
	// for (var i = 0; i < linesArray.length; i++) {
	// 	console.log("-----" + linesArray[i]);
	// }

	if (jobString.indexOf('W ENDED - ABEND=S013') >= 0) {
		lineOutput.push('The sysmod ' + sysmodName + ' does not have an APAR/PTF file submitted in the library\nD55TST.ZOSR2x.LKED.K2x.');
		lineOutput.push('Please check and provide the file.');
	}

	// Case that the sysmod has been already installed in the system
	if ((jobString.indexOf('ENDED - RC=0004') >= 0) && (jobString.indexOf('ALREADY RECEIVED') >= 0)) {
		console.log('The sysmod ' + sysmodName + ' has already been installed in this system.');
		lineOutput.push('The sysmod ' + sysmodName + ' has already been installed in this system. \nHere is its status:');
		for (var i = 0; i < linesArray.length; i++) {
			if (linesArray[i].indexOf('   TYPE            = ') >= 0) {
				while (linesArray[i].indexOf('NOW SET TO GLOBAL ZONE') < 0) {
					// console.log("++++++++" + linesArray[i]);
					lineOutput.push(linesArray[i]);
					i++;
				}
				break;
			}
		}
	}

	// Case of installing successfully and need to IPL or REFRESH
	if ((jobString.indexOf('ENDED - RC=0000') >= 0) ||
		((jobString.indexOf('ENDED - RC=0004') >= 0) && (jobString.indexOf('ALREADY RECEIVED') < 0)) ||
		(jobString.indexOf('ENDED - RC=0001') >= 0)) {
		console.log(sysmodName + ' has been installed successfully.');
		lineOutput.push(sysmodName + ' has been installed successfully. Here is its status:');
		for (var i = 0; i < linesArray.length; i++) {
			if (linesArray[i].indexOf('   TYPE            = ') >= 0) {
				while (linesArray[i].indexOf('NOW SET TO GLOBAL ZONE') < 0) {
					// console.log("++++++++" + linesArray[i]);
					lineOutput.push(linesArray[i]);
					i++;
				}
				break;
			}
		}

		var refreshOrIpl = 'LMOD syslib LINKLIB has been updated with ' + sysmodName + ' applied. \nPlease request a system refresh when you want the fix to be activated.';
		// for (var i = 0; i < linesArray.length; i++) {
		if (jobString.indexOf('NUCLEUS           ' + sysmodName + ' APPLIED') >= 0) {
			refreshOrIpl = 'LMOD syslib NUCLEUS has been updated with ' + sysmodName + ' applied. \nPlease request a system IPLing when you want the fix to be activated.';
		}
		if (jobString.indexOf('LPALIB            ' + sysmodName + ' APPLIED') >= 0) {
			refreshOrIpl = 'LMOD syslib LPALIB has been updated with ' + sysmodName + ' applied. \nPlease request a system IPLing when you want the fix to be activated.';
		}

		if ((jobString.indexOf('NUCLEUS           ' + sysmodName + ' APPLIED') >= 0) || (jobString.indexOf('LPALIB            ' + sysmodName + ' APPLIED') >= 0)) {
			refreshOrIpl = 'LMOD syslibs NUCLEUS and LPALIB has been updated with ' + sysmodName + ' applied. \nPlease request a system IPLing when you want the fix to be activated.';
		}
		lineOutput.push(refreshOrIpl);
	}

	// Case that the sysmod is failed to be installed
	if (jobString.indexOf('ERROR DESCRIPTION AND POSSIBLE CAUSES') >= 0) {
		lineOutput.push('Installing is not completed. \nHere are error description and possible causes:');
		for (var i = 0; i < linesArray.length; i++) {
			if (linesArray[i].indexOf('ERROR DESCRIPTION AND POSSIBLE CAUSES') >= 0) {
				i++;
				while (linesArray[i].indexOf('TARGET ZONE') < 0) {
					// console.log("++++++++" + linesArray[i]);
					lineOutput.push(linesArray[i]);
					i++;
				}
			}
		}
	}

	if (jobString.indexOf('ENDED - RC=0012') >= 0) {
		lineOutput.push('Installing is not completed. The return code is 12.');
		for (var i = 0; i < linesArray.length; i++) {
			if (linesArray[i].indexOf('ENDED BY CC 0012') >= 0) {
				lineOutput.push('The failing step is:' + linesArray[i]);
				i++;
			}
		}
	}

	var textResult = lineOutput.join('\n');
	console.log('textResult:' + textResult);
	return textResult;
}

// function parsingReleaseNumber(host) {                 // Don't need this once D55TST.ZOSR&RLSE..LKED.K&RLSE. is used
// 	var rnum = '';
// 	switch (true) {
// 		case host.indexOf('1') >= 0: rnum = '2';
// 			break;
// 		case host.indexOf('2') >= 0: rnum = '2';
// 			break;
// 		case host.indexOf('3') >= 0: rnum = '3';
// 			break;
// 		case host.indexOf('4') >= 0: rnum = '4';
// 			break;
// 		case host.indexOf('5') >= 0: rnum = '4';
// 			break;
// 		case host.indexOf('6') >= 0: rnum = '2';
// 			break;
// 		case host.indexOf('9') >= 0: rnum = '1';
// 			break;
// 		default: rnum = '2';

// 	}
// 	return rnum;
// }

function pad(n) {
	return n < 10 ? '0' + n : n;
}

module.exports.InstallUserMods = InstallUserMods;