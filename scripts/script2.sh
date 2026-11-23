#!/bin/bash
origin=/home/course/Documents
destination=/home/course/Backups

if [ -d $origin ]; then
	echo "Process stopped, the origin directory does not exist."
else
	if [ !-d $destination ]; then
		mkdir -p $destination
	fi
	backupdate= date "+%Y-%m-%d_%H-%M"
	mkdir $destination/backup_$backupdate
	cp -r $origin $destination/backup_$backupdate
	echo Succesfully created backup at $backupdate
fi
