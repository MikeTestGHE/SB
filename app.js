const process = require('process');
process.title = "SlackBot";
const DIplinfo = require('./DIplinfo.js');
const DsfCommand = require('./DsfCommand.js');
const IplNoForced = require('./IplNoForced.js');
const QueryUsermod = require('./QueryUsermod.js');
const InstallFix = require('./InstallFix.js');
const SlackBot = require('slackbots');
var Client = require('zos-node-accessor');
var Input = require('prompt-input');
var client = new Client();
var input = new Input({
    name: 'first',
    message: 'Enter a manual response?'
});
const bot = new SlackBot({
    // Copy from OAuth Tokens & Redirect URLs: Bot User OAuth Access Token
    token: '',
    name: 'DFSMSbot'
});
var i = 0;
var joblog;
bot.on('start', () => {
    // more information about additional params https://api.slack.com/methods/chat.postMessage
    var params = {
        icon_emoji: ':peng:'
    };
    bot.postMessageToChannel(
        'ask-dfsms-slackbot',
        'Hi! I am DFSMSbot. How may I help you today!',
        params);
});
// Listen to slack messages.
bot.on('message', function (message) {
    var params = {
        icon_emoji: ':mouse:'
    };
    // Reply to humans.
    if (message.type == 'message' && message.text && message.subtype != 'bot_message') {
        //var author = getUserById(message.user);
        //var channel = getChannelById(message.channel);
        console.log('message.type: ------ ' + message.type);
        console.log('message.text: ------ ' + message.text);
        console.log('message.subtype: ------ ' + message.subtype);
        var messageObj = JSON.stringify(message);
        console.log('messageObj: -----' + messageObj.replace(/\",\"/g, '\",\n\"'))

        var input = message.text.toUpperCase().replace(/\*/g, "");

        //:::::::::::::::::::::IPLINFO MESx:::::::::::::::::::::
        if (input.indexOf('IPLINFO') >= 0) {
            console.log("D IPLINFO command", message.text.toUpperCase()); 
            var mesNum = input.match(/\d/g);
            console.log('>>>>>>>>>>>>>>>>', mesNum);
            mesNum = mesNum.join("").replace(/0/g, "");;
            console.log('>>>>>>>>>>>>>>>>', mesNum);
            var HOST = 'SSGMES' + mesNum + '.tuc.stglabs.ibm.com';

            bot.postMessageToChannel(
                'ask-dfsms-slackbot',
                'You are querying the IPL info. I am connecting to system MES0' + mesNum + ' and running the query job now...',
                params);



            DIplinfo.DIplinfo(HOST, (err, joblog) => {
                if (err) throw err;
                console.log('app.js: process Actions done!', joblog);
                bot.postMessageToChannel(
                    'ask-dfsms-slackbot',
                    joblog,
                    params);
                // bot.postMessageToUser('Camvu Pham', joblog, params); >>> doesn't work 
            });
        }


        //:::::::::::::::::::::DSF command MESx:::::::::::::::::::::
        if ((input.indexOf('DSF') >= 0) || (input.indexOf('ICKDSF') >= 0)){
            console.log("ICKDSF command", message.text.toUpperCase());
            input = input.replace('ICKDSF',"").replace('DSF', "").trim();
            console.log('input after remove ICKDSF', input);
            
            if ((input.indexOf('MES ') >= 0) || (input.indexOf('MES  ') >= 0) || (input.indexOf('MES   ') >= 0)){
                input = input.replace('MES ','MES').replace('MES  ', "MES").replace('MES   ', "MES").trim();
            }
        
            var mesName = input.substring(0,input.indexOf(' '));
            console.log('mesName:');
            console.log(mesName, '---');
            
            var cmd = input.substring(input.indexOf(' ')+1, input.length);
            console.log('cmd:');
            console.log(cmd, '---');

            var mesNum = mesName.match(/\d/g);
            console.log('>>>>>>>>>>>>>>>>', mesNum);
            mesNum = mesNum.join("").replace(/0/g, "");;
            console.log('>>>>>>>>>>>>>>>>', mesNum);

            var HOST = 'SSGMES' + mesNum + '.tuc.stglabs.ibm.com';

            bot.postMessageToChannel(
                'ask-dfsms-slackbot',
                'You have issued an ICKDSF command to system MES0' + mesNum + '. I am connecting to system MES0' + mesNum + ' and running the command now...',
                params);



                DsfCommand.DsfCommand(HOST, cmd, (err, joblog) => {
                if (err) throw err;
                console.log('app.js: process Actions done!', joblog);
                bot.postMessageToChannel(
                    'ask-dfsms-slackbot',
                    joblog,
                    params);
                // bot.postMessageToUser('Camvu Pham', joblog, params); >>> doesn't work 
                // bot.postMessageToUser('phamct', joblog, params); >>>  works
            });
        }

        //:::::::::::::::::::::USERMOD xx12345 on MESx:::::::::::::::::::::
        else if ((input.indexOf('USERMOD') >= 0) || (input.indexOf('QUERY') >= 0)) {
            console.log("Query usermod: ", input);

            // What system?
            var mesNum = input.substring(input.indexOf('MES'), input.length).match(/\d+/);
            console.log('>>>>>>>>>>>>>>>>', mesNum);
            mesNum = mesNum.join("").replace(/0/g, "");
            console.log('>>>>>>>>>>>>>>>>', mesNum);
            var HOST = 'SSGMES' + mesNum + '.tuc.stglabs.ibm.com';

            // What usermod?
            var sysmodName = input.replace('USERMOD ', "").replace('QUERY ', "");
            sysmodName = sysmodName.substring(0, 7);

            bot.postMessageToChannel(
                'ask-dfsms-slackbot',
                'You are querying the status of APAR/PTF ' + sysmodName + ' on system MES0' + mesNum + '. I am connecting to the system and running the query job now...',
                params);


            QueryUsermod.QueryUserMods(HOST, sysmodName, (err, joblog) => {
                if (err) throw err;
                console.log('app.js: process Actions done!', joblog);
                bot.postMessageToChannel(
                    'ask-dfsms-slackbot',
                    joblog,
                    params);
            });
        }


        //:::::::::::::::::::::INSTALL xx12345 on MESx 'Validate VTOC free of orphan F3s with SMS cmd-THN' -R :::::::::::::::::::::
        else if (input.indexOf('INSTALL') >= 0) {
            console.log("Install usermod: ", input);

            // What system? MESx and SSGMESx.tuc.stglabs.ibm.com
            var mesNum = input.substring(input.indexOf('MES'), input.length).match(/\d+/);
            console.log('mesNum >>>>>>>>>>>>>>>>', mesNum);
            mesNum = mesNum.join("").replace(/0/g, "");;
            console.log('mesNum >>>>>>>>>>>>>>>>', mesNum);
            var mesName = 'MES' + mesNum;
            console.log('mesName >>>>>>>>>>>>>>>>', mesName);
            var HOST = 'SSGMES' + mesNum + '.tuc.stglabs.ibm.com';

            // What usermod?
            var sysmodName = input.replace('INSTALL ', "");
            sysmodName = sysmodName.substring(0, 7);

            // What description?
            var desc = input.substring((input.indexOf('\'') + 1), input.length);
            console.log('desc >>>>>>>>>>>>>>>>', desc);
            desc = desc.substring(0, desc.indexOf('\''));
            console.log('desc >>>>>>>>>>>>>>>>', desc);

            // Reject?
            var reject = 'default';
            var optionReject = '';
            if ((input.indexOf('-R') >= 0) || (input.indexOf('REJECT') >= 0)) { reject = 'REJECT=YES'; optionReject = ' with option REJECT=YES' }

            // Alternative volume?
            var alt = 'default';
            var volume = 'active';
            if ((input.indexOf('ALT') >= 0)
                || (input.indexOf('ALTERNATIVE') >= 0)
                || (input.indexOf('ALTERNATE') >= 0)) { alt = 'ALT'; volume = 'alternative'; }

            // User email?
            var emailFromUserInput = getUserEmailfromInput(input);

            bot.postMessageToChannel(
                'ask-dfsms-slackbot',
                'You have requested installing the APAR/PTF ' + sysmodName + ' on the ' + volume + ' volume of system MES0' + mesNum + optionReject + '. I am connecting to the system and doing the install now...',
                params);


            InstallFix.InstallUserMods(HOST, mesName, sysmodName, desc, reject, alt, emailFromUserInput, (err, joblog) => {
                if (err) throw err;
                console.log('app.js: process Actions done!', joblog);
                bot.postMessageToChannel(
                    'ask-dfsms-slackbot',
                    joblog,
                    params);
                bot.postMessageToUser('phamct', 'Hi Cam! There is a new APAR/PTF installing activity on ' + mesName + ' from Slack user.\nThe output is:\n' + joblog, params);
                bot.postMessageToUser('keminer', 'Hi Kevin! There is a new APAR/PTF installing activity on ' + mesName + ' from Slack user.\nThe output is:\n' + joblog, params);
            });
        }

        //:::::::::::::::::::::HELLO:::::::::::::::::::::
        else if ((input.indexOf('HI') >= 0) ||
            (input.indexOf('HELLO') >= 0) ||
            (input.indexOf('HEY') >= 0)) {
            console.log("User saying hi ", input);
            bot.postMessageToChannel(
                'ask-dfsms-slackbot',
                "Hello! Hoping that you are having a good one!",
                params);
        }

        //:::::::::::::::::::::IPL MESx:::::::::::::::::::::
        else if (input.indexOf('IPL ') >= 0) {
            console.log("IPL command", input);
            var mesNum = input.match(/\d/g);
            console.log('>>>>>>>>>>>>>>>>', mesNum);
            mesNum = mesNum.join("").replace(/0/g, "");;
            console.log('>>>>>>>>>>>>>>>>', mesNum);
            var sysToIpl = 'MES' + mesNum;
            if (mesNum == '1') {
                var HOST = 'SSGMES2.tuc.stglabs.ibm.com';
            }
            if ((mesNum == '2') || (mesNum == '3') || (mesNum == '5') || (mesNum == '9')) {
                var HOST = 'SSGMES1.tuc.stglabs.ibm.com';
            }
            if (mesNum == '4') {
                var HOST = 'SSGMES6.tuc.stglabs.ibm.com';
            }
            if (mesNum == '6') {
                var HOST = 'SSGMES4.tuc.stglabs.ibm.com';
            }

            var ALT = 'ACT';
            var volume = 'active';
            var force = 'N';
            if (input.indexOf('ALT') >= 0) { ALT = 'ALT'; volume = 'alternative'; }
            if (input.indexOf('FORCE') >= 0) { force = 'Y'; }

            bot.postMessageToChannel(
                'ask-dfsms-slackbot',
                'You are requesting an IPL process with FORCE=' + force + ' for system MES0' + mesNum + ' on the ' + volume + ' volume. I am sending the job now to host system ' + HOST +
                '. Please give me a few seconds.',
                params);

            IplNoForced.IplingNativeSys(HOST, sysToIpl, ALT, force, (err, joblog) => {
                if (err) throw err;
                console.log('app.js: process Actions done!', joblog);
                bot.postMessageToChannel(
                    'ask-dfsms-slackbot',
                    joblog,
                    params);
            });

        }

        else if ((input.indexOf('I\'M') >= 0) || (input.indexOf('I AM') >= 0)) {
            var userName = input.replace('I\'M ', '').replace('I AM ', '');
            console.log("User introduces: ", input);
            bot.postMessageToChannel(
                'ask-dfsms-slackbot',
                "Hi, " + userName + '!',
                params);
        }

        else if ((input.indexOf('HELP') >= 0) ||
            (input.indexOf('WHAT CAN YOU DO') >= 0) ||
            (input.indexOf('WHAT DO YOU DO') >= 0) ||
            (input.indexOf('SYNTAX') >= 0) ||
            (input.indexOf('EXAMPLE') >= 0)) {
            console.log("HELP : ", input);
            bot.postMessageToChannel(
                'ask-dfsms-slackbot',
                `Currently, I can handle:\n
- Query APAR/PTF status: *QUERY AA12345 on MES2*\n
- Check IPL info of a system: *IPLINFO MES2*\n
- IPL a native system: *IPL MES2*, *IPL MES2 with force*, *IPL MES2 ALT*,\n
                *IPL MES2 on alternative volume with force*\n
- Install APAR/PTF: *INSTALL AH20324 on MES2 'MTMM PPRC ESTPAIR 2nd pair fails Hitachi- CP'*,\n
                *INSTALL AH20324 on MES2 _ALT volume_ 'MTMM PPRC ESTPAIR 2nd pair fails Hitachi- CP'*\n
                *INSTALL AH20324 on MES2 _reject_ 'MTMM PPRC ESTPAIR 2nd pair fails Hitachi- CP'*\n
                *INSTALL AH20324 on MES2 MTMM PPRC ESTPAIR 2nd pair fails Hitachi- CP' _and email name@us.ibm.com_*
- Issue ICKDSF commands: *DSF MES3 PPRC QUERY UNIT(9003) ALLOWONLINE*`,
                params);
        }

        else if (input.indexOf('BOTEXIT') >= 0) {
            console.log("Exit bot ", input);
            bot.postMessageToChannel(
                'ask-dfsms-slackbot',
                'Bye bye!',
                params);
            process.exit(1);
        }

        else {
            console.log("Random input: ", input);
            // bot.postMessageToChannel(
            //     'ask-dfsms-slackbot',
            //     "I'm sorry. I have not been trained enough for this.",
            //     params);
        }



    }

    function getUserEmailfromInput(input) {
        var emailFromUserInput = 'default';
        var linesArray = input.split(" ");
        for (var i = 0; i < linesArray.length; i++) {
            if (linesArray[i].indexOf('@') >= 0) {
                emailFromUserInput = linesArray[i].replace('<MAILTO:', '');
            }
        }
        emailFromUserInput = emailFromUserInput.substring(0, emailFromUserInput.indexOf('|'));
        return emailFromUserInput;
    }

});
