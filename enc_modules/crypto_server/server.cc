

// Code adapted from http://www.linuxhowtos.org/C_C++/socket.htm

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h> 
#include <sys/socket.h>
#include <netinet/in.h>
#include <cstdlib>
#include <cstring>
#include <string>

#include "CryptoServer.h"

using namespace std;

static void
error(const char *msg)
{
    perror(msg);
    exit(1);
}

int
main(int argc, char *argv[]) {
    int sockfd, newsockfd, portno;
    socklen_t clilen;
    char buffer[4096];
    struct sockaddr_in serv_addr, cli_addr;
    int n;
    string resp;
 

    portno = 8082;
    
    sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd < 0) 
	error("ERROR opening socket");

    // allow reuse of this socket in case we restarted server
    int optval;
    // set SO_REUSEADDR on a socket to true (1):
    optval = 1;
    setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &optval, sizeof optval);
  
  
    bzero((char *) &serv_addr, sizeof(serv_addr));
    serv_addr.sin_family = AF_INET;
    serv_addr.sin_addr.s_addr = INADDR_ANY;
    serv_addr.sin_port = htons(portno);
    if (bind(sockfd, (struct sockaddr *) &serv_addr,
	     sizeof(serv_addr)) < 0) 
	error("ERROR on binding");
    
    listen(sockfd,5);

    CryptoServer cs;
    
    clilen = sizeof(cli_addr);

    cerr << "Crypto server running..\n";

    //listen indefinitely
    while (true) {
	 newsockfd = accept(sockfd, 
			    (struct sockaddr *) &cli_addr, 
			    &clilen);
	 if (newsockfd < 0) 
	     error("ERROR on accept");
	 bzero(buffer,4096);
	 n = read(newsockfd,buffer,4096);
	 if (n < 0) error("ERROR reading from socket");

	 if (VERB)
	     cerr << "\n\n=================== \n message " << buffer;
	 
	 resp = cs.process(string(buffer));
	 
	 n = write(newsockfd,resp.c_str(), resp.length());
	 
	 if (n < 0) error("ERROR writing to socket");
	 close(newsockfd);
	 
     }
    
     close(sockfd);
     return 0; 
}


