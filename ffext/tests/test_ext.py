import time
import numpy
import sys
from selenium import webdriver
from selenium.webdriver.common.keys import Keys

REPS = 10
PLAIN = ('https://18.26.4.162', 'kChat')
HTTPS = ('https://18.26.4.162','kChat')
ENC = ('https://18.26.4.162:4344','kChat')

def test_main(p):
    driver = webdriver.Firefox(p)
    time.sleep(0.5)
    t1 = test_enc_page(driver)
    #t2 = test_other_page(driver)
    #t3 = test_other_page_https(driver)
    driver.close()
    return [t1]#,t2,t3]

def test_generic(driver,page):
    driver.get(page[0])
    assert page[1] in driver.title
    time.sleep(2)
    dur = driver.execute_script("return performance.timing.loadEventEnd - performance.timing.navigationStart")
    return dur

def test_enc_page(driver):
    return test_generic(driver,ENC)

def test_other_page(driver):
    return test_generic(driver,PLAIN)

def test_other_page_https(driver):
    return test_generic(driver,HTTPS)

def test_without_ext():
    p = webdriver.FirefoxProfile() #'/home/user7/.mozilla/firefox/lhp20k8k.dev')
    t = test_main(p)
    print "plain: {0}".format(t)
    return t

def test_with_ext():
    p = webdriver.FirefoxProfile() #'/home/user7/.mozilla/firefox/lhp20k8k.dev')
    p.add_extension('../extension')
    t = test_main(p)

    print "+ext: {0}".format(t)
    return t


def main():
    plain = []
    ext = []
    reps = REPS
    testtype = "all"
    if(len(sys.argv) > 1):
        reps = int(sys.argv[1])
    if(len(sys.argv) > 2):
        testtype = sys.argv[2]

    print "will run {0} tests for {1}".format(reps,testtype)
    for i in range(0,reps):
        if(testtype == "ext" or testtype == "all"):
            ext.append(test_with_ext())
        if(testtype == "plain" or testtype == "all"):
            plain.append(test_without_ext())

    if(testtype == "plain" or testtype == "all"):
        print "means for plain",numpy.mean(plain,axis=0)
    if(testtype == "ext" or testtype == "all"):
        print "means for ext",numpy.mean(ext,axis=0)

if __name__ == '__main__':
    main()
