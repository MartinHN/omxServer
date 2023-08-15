if test -f "/boot/noVlc"; then
    echo "prevent vlc start"
    exit 0
fi

RCF="/home/pi/.bash_profile"
if [[ -f $RCF ]]; then
    echo "init pi"
    source $RCF
fi

node --unhandled-rejections=strict src/slaveInstance.mjs

# FILE=/boot/isMaster
# if test -f "$FILE"; then
#     echo "starting as Master"
#     node src/server.mjs
# else
#     echo "starting as slave"
#     node src/slaveInstance.mjs
# fi
