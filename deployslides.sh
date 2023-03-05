#!/bin/bash

set -e

if [ -f ".env" ]; then
  source .env
fi

if [[ $SLIDE_DIR_NAME == "" ]] ; then
  echo "<<<<<<<<<< ❌❌❌ >>>>>>>>>>>"
  echo '$SLIDE_DIR_NAME should be setted'
  echo ''

  exit 1
fi

if [ ! -d tmp/.slide_tmp ] ; then 
  mkdir -p tmp/.slide_tmp
fi

cp -rf $SLIDE_DIR_NAME tmp/.slide_tmp/

qshell qupload qupslides.json

rm -rf tmp/.slide_tmp
