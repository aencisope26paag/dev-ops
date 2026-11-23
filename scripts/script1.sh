#!/bin/bash
echo "Introduce the name of teh new user"
read user
if [-d "/home/course/Documents/Users/$user" ]; then
	echo "The user exists"
else
	mkdir -p /home/course/Documents/Users/$user
	touch /home/course/Documents/Users/$user/Profile-$user.txt
	echo "The user and its profile succesfully created"
fi
