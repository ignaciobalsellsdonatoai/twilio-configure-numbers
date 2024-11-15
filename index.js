const twilio = require('twilio');
const fs = require('fs');
const csv = require('csv-parser');

const accountSid = 'Account SID';
const accountAuthToken = 'Account token';


async function test() {
  const client = new twilio(accountSid, accountAuthToken,{ accountSid: subAccountSid });
  const subaccount = await client.incomingPhoneNumbers.list()
  console.log(subaccount);
}

function createTwimletUrl(phoneNum) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial record="record-from-answer">${phoneNum}</Dial></Response>`;
    return 'https://twimlets.com/echo?Twiml=' + encodeURIComponent(twiml);
  }

async function configurePhoneNumbersForSubaccount(phoneArray, client) {
  try {
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    //console.log(phoneNumbers)
    for (const numObj of phoneArray) {
      const trackingNum = '+' + numObj.trackingNumber;
      const numbersToConfig = phoneNumbers.filter(number => number.phoneNumber === trackingNum);
      for(const twilioNumObj of numbersToConfig) {
        console.log('Processing phone number: ', twilioNumObj.phoneNumber)
        const twimletUrl = createTwimletUrl(numObj.forwardsTo)
        await client.incomingPhoneNumbers(twilioNumObj.sid).update({
            voiceUrl: twimletUrl,
            friendlyName: numObj.friendlyName
        })
        console.log(`Friendly name updated! ${numObj.friendlyName}`)
      }
    }
    
    
    //console.log('How many Phone Numbers:', portingInNumbers.length);

    

  } catch (error) {
    console.error('Error configuring phone numbers:', error);
  }
}

async function processAllSubaccounts(dataArr, subAccounts) {
  try {
    for (const subaccount of subAccounts) {
      const phoneArray = dataArr.filter(row => row.subAccountId === subaccount)
      if(phoneArray.length > 0) {
        const client = new twilio(accountSid, accountAuthToken,{ accountSid: subaccount });
        console.log(`Procesing: ${subaccount}`)
        //console.log(phoneArray)
        await configurePhoneNumbersForSubaccount(phoneArray, client);
      }
      else {
        console.log(`No phone numbers asociated to ${subaccount}`)
      }
    }
  } catch (error) {
    console.error('Error processing subaccounts:', error);
  }
} 

function extractUniqueSubaccounts(dataArr) {
  const uniqueSubAccountIds = [...new Set(dataArr.map(item => item.subAccountId))];
  return uniqueSubAccountIds;
}

//processAllSubaccounts([])

function readCsvAndConfigurePhoneNumbers(filePath) {
    const phoneNumbers = [];
  
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        phoneNumbers.push({
          trackingNumber: row['Tracking Number'],
          forwardsTo: row['Forwards To'],
          friendlyName: row['Friendly Name'],
          subAccountId: row['Subaccount ID']
        });
      })
      .on('end', () => {
        console.log('CSV file successfully processed');
        const subAccounts  = extractUniqueSubaccounts(phoneNumbers)
        processAllSubaccounts(phoneNumbers, subAccounts)
      });
      
  }

  
readCsvAndConfigurePhoneNumbers('E:/Donato/twilio-configure-numbers/test.csv');

