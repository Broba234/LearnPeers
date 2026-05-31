import Link from "next/link";
import { FaLinkedin, FaTwitter, FaInstagram, FaEnvelope, FaMapMarkerAlt, FaPhone } from "react-icons/fa";

export default function Footer() {
    return (
        <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 lg:gap-12">
                    {/* Company Info */}
                    <div className="space-y-4 sm:space-y-6 sm:col-span-2 lg:col-span-1">
                        <Link href="/" className="inline-block">
                            <span className="font-black text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
                                LearnPeers
                            </span>
                        </Link>
                        <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-md">
                            The peer tutoring marketplace where students book live help from other students—and get paid to teach what they know.
                        </p>
                        <div className="flex space-x-4 pt-2">
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-blue-600 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                <FaLinkedin className="text-lg" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-sky-400 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                <FaTwitter className="text-lg" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-pink-600 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                <FaInstagram className="text-lg" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-red-500 flex items-center justify-center transition-all duration-300 hover:scale-110">
                                <FaEnvelope className="text-lg" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-white border-l-4 border-blue-500 pl-3">Quick Links</h3>
                        <ul className="space-y-3 sm:space-y-4">
                            <li>
                                <Link href="/" className="text-gray-300 hover:text-blue-400 transition-colors duration-200 flex items-center group text-sm sm:text-base">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link href="/#our-mission" className="text-gray-300 hover:text-blue-400 transition-colors duration-200 flex items-center group text-sm sm:text-base">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                                    Our mission
                                </Link>
                            </li>
                            <li>
                                <Link href="/home/student/explore" className="text-gray-300 hover:text-blue-400 transition-colors duration-200 flex items-center group text-sm sm:text-base">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                                    Find tutors
                                </Link>
                            </li>
                            <li>
                                <Link href="/home/tutor/profile" className="text-gray-300 hover:text-blue-400 transition-colors duration-200 flex items-center group text-sm sm:text-base">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                                    Teach &amp; earn
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-white border-l-4 border-teal-500 pl-3">Legal</h3>
                        <ul className="space-y-3 sm:space-y-4">
                            <li>
                                <Link href="#" className="text-gray-300 hover:text-teal-400 transition-colors duration-200 text-sm sm:text-base">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-300 hover:text-teal-400 transition-colors duration-200 text-sm sm:text-base">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-300 hover:text-teal-400 transition-colors duration-200 text-sm sm:text-base">
                                    Cookie Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-300 hover:text-teal-400 transition-colors duration-200 text-sm sm:text-base">
                                    GDPR Compliance
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-white border-l-4 border-purple-500 pl-3">Contact Us</h3>
                        <ul className="space-y-3 sm:space-y-4">
                            <li className="flex items-start gap-3">
                                <FaMapMarkerAlt className="text-blue-400 mt-1 flex-shrink-0" />
                                <span className="text-gray-300 text-sm sm:text-base">123 Innovation Street, Tech City, TC 10001</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <FaPhone className="text-blue-400 flex-shrink-0" />
                                <span className="text-gray-300 text-sm sm:text-base">+1 (555) 123-4567</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <FaEnvelope className="text-blue-400 flex-shrink-0" />
                                <span className="text-gray-300 text-sm sm:text-base break-all">hello@learnpeers.com</span>
                            </li>
                        </ul>
                        
                        {/* Newsletter Subscription */}
                        <div className="mt-6 sm:mt-8">
                            <h4 className="font-semibold mb-3 text-gray-200">Stay Updated</h4>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                                <input 
                                    type="email" 
                                    placeholder="Your email"
                                    className="flex-grow px-4 py-2 sm:rounded-l-lg sm:rounded-r-none rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 px-4 py-2 sm:rounded-r-lg sm:rounded-l-none rounded-lg font-medium transition-all duration-300 whitespace-nowrap">
                                    Subscribe
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700 my-8 sm:my-12"></div>

                {/* Bottom Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                    <div className="text-gray-400 text-sm order-2 md:order-1">
                        &copy; {new Date().getFullYear()} <span className="text-white font-semibold">LearnPeers</span>. All rights reserved.
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-6 order-1 md:order-2">
                        <Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                            Terms of Service
                        </Link>
                        <Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/#contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                            Contact
                        </Link>
                        <div className="flex items-center space-x-2 w-full justify-center md:w-auto md:justify-end">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-teal-400 to-teal-500"></div>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"></div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}