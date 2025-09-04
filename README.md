# API.SPOT-HINTA.FI / For Shelly Plus smart relays
Spot-hinta.fi Shelly Plus scripts automate relays according to the electricity spot-prices, which are read from the api.spot-hinta.fi. Scripts works in Finland, Sweden, Norway, Denmark, Estonia, Latvia and Lithuania. See API Swagger documentation for details: https://api.spot-hinta.fi/swagger/ui

Study scripts and read comments to select which script suits the best for your needs.

## Installation instructions

1. Open web browser and go to Shelly Web Admin aka device's web user interface.
2. Update Shelly firmware to the latest version: Settings > Firmware > Update.
3. Go to Scripts > Library > Configure URL and insert library URL: http://api.spot-hinta.fi/Shelly/scripts
4. Choose the script you like and press "Insert code". 
5. Adjust script settings according to your needs. Scripts have comments in English.
6. Test script: Change the settings and verify that the relay is does the expected thing.
7. Use SmartMonitoring script to monitor script execution. Test Monitoring script by manually stopping monitored script(s) - monitoring script should restart the script shortly. 

Enjoy automatic control of your relays when the electricity price is cheap (or maybe not cheap, but at least not the most expensive)


## Shelly scripts in this package

### Floorheat.js
Combines Shelly 1PM along Plus Add-On with temperature sensor
