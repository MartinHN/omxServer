FILE=/boot/isMaster
if test -f "$FILE"; then
    echo "starting as Master"
    node src/server.mjs
else
    echo "starting as slave"
    node src/slaveInstance.mjs
fi
