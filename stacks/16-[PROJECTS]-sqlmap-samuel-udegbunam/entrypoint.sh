#!/bin/sh
mkdir -p /shells /opt/flagbox /tmp/uploads
chmod 777 /shells /tmp/uploads
printf '%s\n' 'flag{root_of_all_shells}' > /opt/flagbox/flag
chmod 755 /opt/flagbox
exec node server.js
