#!/usr/bin/env python
import roslib

roslib.load_manifest('robair_demo')

import rospy
import os

from robair_demo.msg import Command
from robair_demo import keylogger

import tornado.httpserver
import tornado.websocket
import tornado.ioloop
import tornado.web
import json
 
 
class WSHandler(tornado.websocket.WebSocketHandler):        
       
    def open(self):
        print 'new connection with : %s' %self
      
    def on_message(self, message):
        print 'message received %s' % message
        
        self.pub = rospy.Publisher('/cmd', Command)
        rospy.init_node('keyboard')
    	try:
            directions = { "top": 0,
                        "bottom": 1,
                        "left": 2,
                        "right": 3,
                        "s": 4}            
            decoded = json.loads(message)
	    for type, payload in decoded.items():
                if payload in directions.keys():
                    print("%s" % payload)
                    self.pub.publish(Command(directions[payload],0.0,0.0))
                elif (payload=='p'):
                    os.system("rosrun sound_play play.py ~/ros_workspace/robair_demo/voix/pres.wav &") 
                elif (payload=='o'):
                    os.system("rosrun sound_play play.py ~/ros_workspace/robair_demo/voix/exterminate.wav &") 
                elif (payload=='i'):
                    os.system("rosrun sound_play play.py ~/ros_workspace/robair_demo/voix/pardon.wav &") 
                elif (payload=='u'):
                    os.system("rosrun sound_play play.py ~/ros_workspace/robair_demo/voix/merci.wav &")           
	except (ValueError, KeyError, TypeError):
            print("JSON format error")
 
    def on_close(self):
      print 'connection closed'
 
 
application = tornado.web.Application([
    (r'/ws', WSHandler),
])
 
 
if __name__ == "__main__":
    os.system("rosrun sound_play soundplay_node.py &")
    http_server = tornado.httpserver.HTTPServer(application)
    http_server.listen(8081)
    tornado.ioloop.IOLoop.instance().start()
