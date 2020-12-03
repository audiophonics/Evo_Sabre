import socket
import os
import threading
import json 
import time 

# unix domain socket async server 
# reads data from multiple clients on socket path defined in server_address
class uds_input:
    def __init__(self, server_address):
        self.server_address = server_address
        self.events = event_emitter()
        try:
            os.unlink(server_address)
        except OSError:
            if os.path.exists(server_address):
                raise      
        self.onmessage = False    
        self.thread = threading.Thread(target=self.start)
        self.thread.start()
        
    def handle_client(self,connection,client_address):
        while True:
            data = connection.recv(1024).decode('utf-8')
            if data:
                # fire event hook 
                if callable(getattr(self,"onmessage", None)):
                    self.onmessage(data)
            else:
                break
        connection.close()

    def start(self):
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.bind(self.server_address)
        sock.listen(1)   
        while True:
            connection, client_address = sock.accept()
            thread = threading.Thread(target=self.handle_client,args=(connection,client_address),daemon=True)
            thread.start()
        sock.close()


# Api monitor :
#
# Instead of having a single main loop for executing a sequence of checks,
# each check is its own custom loop running at its own frequency. 
# Pass parameter fn : custom loop logic and data to be returned after check (dict).
# Pass parameter sleep : how long will the loop sleep between two checks.
#
# Emits event for each value change (e.g. if property "artist_name" has changed,
# event will have "artist_name" as event name and the new value for "artist_name"
# as parameter 
class change_monitor:
    def __init__(self, fn, sleep):    
        self.sleep = sleep
        self.fn = fn
        self.events = event_emitter()
        self.events.get_data = self.get_data
        self.onchange = False 
        self.data = {}        
        self.thread = threading.Thread(target=self.start)
        self.thread.start()

    def start(self):
        while True:
            new_data = self.fn()
            for i in new_data:
                # if key i is already registerd
                if i in self.data :
                    # check if value has changed 
                    if new_data[i] != self.data[i]:
                         # if so update value
                        self.data[i] = new_data[i]
                        # fire event hook 
                        self.events.emit(i,self.data[i])
                # otherwise if key i is not registerd   
                else  :
                    # register key i
                    self.data[i] = new_data[i]
                    # fire event hook 
                    self.events.emit(i,self.data[i])
            time.sleep(self.sleep)	         

    def get_data(self):
        return self.data
            
# Tiny event emitter with instantiation :
#
# Abstraction for async event propagating.
# 
# Create instance of event_emitter. An instance is a tool to bind
# a set of eventlisteners to a specific scope. It provide a method 
# to enclose a set of event rules into a single object. So we can
# easily discard and revoke them all when their common purpose has
# been fulfilled. 
# Attach a listener to event_emiter instance : 
#    instance.addEventListener("test",myFunction) 
#       =>  event_emitter.emit("test",1,2)
#       =>  will run myFunction(1,2) parameters passed as *args

class event_emitter:
    def __init__(self):
        self.eventlisteners = {}
        self._instances = []
    def emit(self,event_name,*args):
        print("event : ", event_name,*args)
        for i in self._instances:
            i._emit(event_name,*args)
        
    def instance(self):
        inst = event_register_instance(self)
        self._instances.append(inst)
        return (inst)
    
    def json_to_events(self,data):
        # test if valid json, return if not    
        try:                                                
            parsed_data = json.loads(data)
        except:
            return
        for i in parsed_data:
            # force value to be encapsuled in a list
            # (allows handling of events with n number of arguments)            
            if not isinstance(parsed_data[i], list):       
                parsed_data[i] = [parsed_data[i]]               
            self.emit(i, *parsed_data[i])   
            
    def get_data(self):
        return {}

class event_register_instance:
    def __init__(self, parent):
        self.eventlisteners = {}
        self._parent = parent 
        self.muted = False
        
    def mute(self):
        self.muted = True
        
    def unmute(self):
        self.muted = False
        
    @property    
    def data(self):
        return self._parent.get_data()
        
    def remove(self,*args):
        self.eventlisteners = {}
        self._parent._instances.remove(self)
        
    def _emit(self,event_name,*args):
        if self.muted : return
        if event_name in self.eventlisteners:
            for i in self.eventlisteners[event_name]:
                i(*args)
        
    # Register new event listener (function that will run when attached event is emitted).
    # If event name is alreay registered, attach function to this event name.
    # Otherwise, register event name and attach function
    def addEventListener(self,event_name, fn):
        if event_name in self.eventlisteners:
            self.eventlisteners[event_name].append(fn)
        else:
            self.eventlisteners[event_name] = [fn]   

     def addEventListeners(self,event_names, fn):
        for i in event_names:
            self.addEventListener(self,event_name, fn):
           
            
    # Remove event listener from eventlisteners list.
    # Check if event is registered and if it contains function.
    # If so remove function from event listener
    def removeEventListener(self,event_name, fn):
        if event_name in self.eventlisteners and fn in self.eventlisteners[event_name]:
            self.eventlisteners[event_name].remove(fn)      

    # Register new event listener that whill run only once.  
    # Wrap function in a function that remove itself from listeners list 
    # and call original function.
    #
    # Wrapped function is registered as event listener instead of original fn
    def addEventListenerOnce(self,event_name, fn):          
        def wrapped_fn(*args):      
            self.removeEventListener(event_name,wrapped_fn) 
            fn(*args)                                       
        self.addEventListener(event_name, wrapped_fn)
            