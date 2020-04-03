'use strict';
/**********************************************************************
*  Variables for zos-node-accessor module
**********************************************************************/
var fs = require('fs');
var path = require('path');
var Q = require('q');
var Client = require('zos-node-accessor');
// var USERNAME = 'phamct'
// var PASSWD = 'phongvu2'
// var HOST         = 'SSGMES2.tuc.stglabs.ibm.com'
var MAX_QUERIES = 10;              // Query 10 times at most
var QUERY_INTERVAL = 1000;         // 1 seconds
var client = new Client();

function DIplinfo(HOST,callback) {
   // var HOST = '9.11.116.73';
   // var HOST = 'SSGMES2.tuc.stglabs.ibm.com';
    var USERNAME = 'phamct';
    var PASSWD = 'phongvu4';
    //    var USERNAME = 'trinhng';
    //    var PASSWD = 'sep09cin';
    var JCLjob = DIplinfoCurrent();
    console.log('DIplinfo: DIplinfoNativeSys: MESxx IP: ', HOST);
    client.connect({ user: USERNAME, password: PASSWD, host: HOST })
        .then(function (client) {
            // _client = client;
            if (client.connected) {
                console.log('DIplinfo: Connected to...', HOST);
                return client;
            } else {
                console.log('DIplinfo: Failed to connect to', HOST);
            }
            return Q.reject('DIplinfo: Failed to connect to', HOST);
        });
    return SubmitDIplinfoJob(client, JCLjob, callback);
}    // end: DIplinfoNativeSys

function SubmitDIplinfoJob(client, JCLjob, callback) {
    submitJob(client, JCLjob).then(function (result) {
        console.log('DIplinfo: SubmitDIplinfoJob: ' + result.jobName + ' JobID...' + result.jobId);
        client.getJobLog(result.jobName, result.jobId, '5')
            .then(function (jobLog) {
                console.log('DIplinfo: getJobLog: Job log output:' + jobLog);
                client.close();
                console.log('<=======================CLOSE CONNECTION=========================>');
                callback(null, parsing(jobLog));
            })
    }).catch(function (err) {
        console.log('DIplinfo: SubmitDIplinfoJob: returned an error');
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
            console.log('DIplinfo: Submitted: ', job.jobName, jobId);
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
            console.log(jobId, rc);        // JOBxxxxx Success or Failing
            if (rc === Client.RC_SUCCESS || rc === Client.RC_FAIL) {
                if (rc == Client.RC_SUCCESS) {
                    console.log('DIplinfo: pollJCLJobStatus->RC:' + rc);
                }
                deferred.resolve({ jobName: jobName, jobId: jobId, rc: rc });
            } else {
                setTimeout(function () {
                    pollJCLJobStatus(deferred, client, jobName, jobId, timeOutCount - 1);
                }, QUERY_INTERVAL);
            }
        });
}
function DIplinfoCurrent() {
    var jcl = fs.readFileSync(path.join(__dirname, '/lib/JCL/MVSDIPLINFO.jcl'), 'utf8');
    return { jobName: 'MVSDINFO', jcl: jcl };
}
function parsing(jobString) {
    var linesArray = jobString.split(/\r?\n/);
    for (var i = 0; i < linesArray.length; i++) {
        console.log("DIplinfo: parsing: " + linesArray[i]);
    }
    linesArray.splice(0, 3);
    var textResult = 'IPL Info Result :\n' + linesArray.join('\n');
    return textResult;
}
module.exports.DIplinfo = DIplinfo;