/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 */
'use strict';
var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests

/**********************************************************************
 *  Variables for zos-node-accessor module 
 **********************************************************************/
// var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');
var sinon = require('sinon');
var Q = require('q');
var Client = require('zos-node-accessor');

var PWfilePath = "./lib/WCBUSER_pw.txt";
var USERNAME = 'WCBUSER';
var PASSWD = fs.readFileSync(PWfilePath, 'utf8').trim();

var MAX_QUERIES = 5;          	// Query 100 times at most
var QUERY_INTERVAL1 = 2000;     	// 2 seconds
var QUERY_INTERVAL1 = 1000;     	// 2 seconds
var QUERY_INTERVAL = 30000;     	// 1 seconds

var client = new Client();
function IplingNativeSys(HOST, sysToIpl, ALT, force, callback) {
    // var UserTsoID = IplNoForcedAction.parameters.userName;
    var JCLjob = IplCurrent(sysToIpl, USERNAME, ALT, force);
    console.log(sysToIpl + '++++++++++++++++++++++++++++++++++++++++++++++++++++');
    console.log(HOST + '+++++++++++++++++++++++++++++++++++++++++++++');
    client.connect({ user: USERNAME, password: PASSWD, host: HOST })
        .then(function (client) {
            _client = client;
            if (client.connected) {
                console.log('Connected to...', HOST);
                return client;
            } else {
                console.log('Failed to connect to', HOST);
            }
            return Q.reject('Failed to connect to', HOST);
        });
    return SubmitIplingJob(client, JCLjob, callback);
}	// end: IplingNativeSys


function SubmitIplingJob(client, JCLjob, callback) {
    var jobInfo;
    //var jobInfoArray = [];
    submitJob(client, JCLjob).then(function (result) {
        console.log('SubmitIplingJob: ' + result.jobName + ' JobID: ' + result.jobId + ' Status: ' + result.rc);

        jobInfo = 'The active IPL job name and IPL job ID is: ' + result.jobName + ', ' + result.jobId + ', ' + result.rc;

        // if (result.rc === 'active') {
        //     console.log('jobInfo: ' + jobInfo);
        //     callback(null, jobInfo + '\nPlease give the system 2 to 4 minutes to IPL. \nThe IPL status is being reported on the z/Os Status Log screen on the right.');
        // }

        setTimeout(function () {
            if (result.rc === 'active') {
                console.log('jobInfo: ' + jobInfo);
                callback(null, jobInfo + `\nIPLing process has been started. 
                Please give the system 2-4 minutes to finish IPLing.`);
            }
        }, 7000);

        //jobInfoArray.push(result.jobName);
        //jobInfoArray.push(result.jobId);
        if (result.rc === 'success') {
            console.log('result.rc === ' + result.rc);
            console.log('getJobLog');
            console.log('result.jobName - ', result.jobName);
            console.log('result.jobId - ', result.jobId);
            client.getJobLog(result.jobName, result.jobId, 'x')
                .then(function (jobLog) {
                    // console.log('getJobLog: Job log output:' + jobLog);
                    client.close();
                    console.log('<=======================CLOSE CONNECTION=========================>');
                    callback(null, parsing(jobLog));
                    // callback(null, 'The IPL process is now terminated with the message');
                });
        }

    }).catch(function (err) {
        console.log('IplingNativeSys(IplNoForcedAction): returned an error');
        console.dir(err);
        //callback(JSON.stringify(error.jobLog));
    });
    // console.log('read dataset >>>> ' + readDataset(client));
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
            if (rc === Client.RC_FAIL || rc === Client.RC_SUCCESS || rc === Client.RC_ACTIVE) {            // @THN1
                // if (rc == Client.RC_ACTIVE) {                                  // @THN1
                console.log('pollJCLJobStatus->RC:' + rc);
                // }
                deferred.resolve({ jobName: jobName, jobId: jobId, rc: rc });

            } else {
                setTimeout(function () {
                    pollJCLJobStatus(deferred, client, jobName, jobId, timeOutCount - 1);
                }, QUERY_INTERVAL);
            }
        });

}

function IplCurrent(sysToIpl, USERNAME, ALT, force) {
    var jcl = fs.readFileSync(path.join(__dirname, '/lib/JCL/AUTOIPL.jcl'), 'utf8');
    jcl = jcl.replace('__VOLSERTYPE__', ALT);
    if (force == 'Y') { jcl = jcl.replace('__FORCEBOOLEAN__', force); }
    else {
        jcl = jcl.replace('__FORCEBOOLEAN__', 'N');
    }
    jcl = jcl.replace(/__SYSTEMNAME__/g, sysToIpl);
    jcl = jcl.replace('__USERID__', USERNAME);
    jcl = jcl.replace('__JOBNAME__', 'AUTOIPLW');
    // jcl = jcl.replace('__WUSER__', UserTsoID);
    return { jobName: 'AUTOIPLW', jcl: jcl };
}

function parsing(jobString) {
    var linesArray = jobString.split(/\r?\n/);
    for (var i = 0; i < linesArray.length; i++) {
        console.log("-----" + linesArray[i]);
    }

    // var lineOutput = [];
    var textResult = 'end';
    for (var i = 0; i < linesArray.length; i++) {
        if (linesArray[i].indexOf('Exiting from AutoIPL with RC') >= 0) {
            textResult = 'The IPL process is now terminated with the message:\n'
                + linesArray[i] + '\n'
                + linesArray[i + 1] + '\n'
                + linesArray[i + 2] + '\n'
                + linesArray[i + 3] + '\n'
                + linesArray[i + 4] + '\n';
            // + linesArray[i + 5] + '\n';
        }
    }
    // var textResult = lineOutput.join('\n');
    console.log('textResult:' + textResult);
    return textResult;
}


module.exports.IplingNativeSys = IplingNativeSys;
