export default {
	leftSidebar: '[role="navigation"][class="x9f619 x1n2onr6 x1ja2u2z x78zum5 xdt5ytf x2lah0s x193iq5w xeuugli"] > div > div', // ! Tray icon dependency
	chatsIcon: '[class="x9f619 x1n2onr6 x1ja2u2z x78zum5 xdt5ytf x2lah0s x193iq5w xdj266r"] a', // ! Tray icon dependency
	conversationList: '[role=navigation] [role=grid] [class="x1n2onr6"]',
	conversationSelector: '[role=main] [role=grid]',
	conversationSidebarUnreadDot: 'x1i10hfl x1qjc9v5 xjbqb8w xjqpnuy xa49m3k xqeqjp1 x2hbi6w x13fuv20 xu3j5b3 x1q0q8m5 x26u7qi x972fbf xcfux6l x1qhh985 xm0m39n x9f619 x1ypdohk xdl72j9 x2lah0s xe8uvvx xdj266r x11i5rnm xat24cr x1mh8g0r x2lwn1j xeuugli xexx8yu x4uap5 x18d9i69 xkhd6sd x1n2onr6 x16tdsg8 x1hl2dhg xggy1nq x1ja2u2z x1t137rt x1o1ewxj x3x9cwd x1e5q0jg x13rtm0m x1q0g3np x87ps6o x1lku1pv x78zum5 x1a2a7pz',
	conversationSidebarTextParent: 'html-span xdj266r x11i5rnm xat24cr x1mh8g0r xexx8yu x18d9i69 xkhd6sd x1hl2dhg x16tdsg8 x1vvkbs x6s0dn4 x9f619 x78zum5 x193iq5w xeuugli xg83lxy', // Parent element of the conversation text element (needed for notifications)
	conversationSidebarTextSelector: '[class="x1lliihq x193iq5w x6ikm8r x10wlt62 xlyipyv xuxw1ft"]', // Generic selector for the text contents of all conversations
	conversationSidebarSelector: '[class="x9f619 x1n2onr6 x1ja2u2z x78zum5 x2lah0s x1qughib x6s0dn4 xozqiw3 x1q0g3np"]', // Selector for the top level element of a single conversation (children contain text content of the conversation and conversation image)
	notificationCheckbox: '._374b:nth-of-type(4) ._4ng2 input',
	rightSidebarMenu: '.x6s0dn4.x3nfvp2.x1fgtraw.xl56j7k.x1n2onr6.xgd8bvy',
	rightSidebarButtons: '.x9f619.x1ja2u2z.x78zum5.x2lah0s.x1n2onr6.xl56j7k.x1qjc9v5.xozqiw3.x1q0g3np.xn6708d.x1ye3gou.x1cnzs8.xdj266r.x11i5rnm.xat24cr.x1mh8g0r > div [role=button]',
	muteIconNewDesign: 'path[d="M29.676 7.746c.353-.352.44-.92.15-1.324a1 1 0 00-1.524-.129L6.293 28.29a1 1 0 00.129 1.523c.404.29.972.204 1.324-.148l3.082-3.08A2.002 2.002 0 0112.242 26h15.244c.848 0 1.57-.695 1.527-1.541-.084-1.643-1.87-1.145-2.2-3.515l-1.073-8.157-.002-.01a1.976 1.976 0 01.562-1.656l3.376-3.375zm-9.165 20.252H15.51c-.313 0-.565.275-.506.575.274 1.38 1.516 2.422 3.007 2.422 1.49 0 2.731-1.042 3.005-2.422.06-.3-.193-.575-.505-.575zm-10.064-6.719L22.713 9.02a.997.997 0 00-.124-1.51 7.792 7.792 0 00-12.308 5.279l-1.04 7.897c-.089.672.726 1.074 1.206.594z"]',
	// ! Very fragile selector (most likely cause of hidden dialog issue)
	closePreferencesButton: 'div[role=dialog] > div > div > div:nth-child(2) > [role=button]',
	userMenu: '.qi72231t.o9w3sbdw.nu7423ey.tav9wjvu.flwp5yud.tghlliq5.gkg15gwv.s9ok87oh.s9ljgwtm.lxqftegz.bf1zulr9.frfouenu.bonavkto.djs4p424.r7bn319e.bdao358l.fsf7x5fv.tgm57n0e.jez8cy9q.s5oniofx.m8h3af8h.l7ghb35v.kjdc1dyq.kmwttqpk.dnr7xe2t.aeinzg81.srn514ro.oxkhqvkx.rl78xhln.nch0832m.om3e55n1.cr00lzj9.rn8ck1ys.s3jn8y49.g4tp4svg.o9erhkwx.dzqi5evh.hupbnkgi.hvb2xoa8.fxk3tzhb.jl2a5g8c.f14ij5to.l3ldwz01.icdlwmnq > .aglvbi8b.om3e55n1.i8zpp7h3.g4tp4svg',
	userMenuNewSidebar: '[role=navigation]  > div >  div:nth-child(2) > div > div > div:nth-child(1) [role=button]',
	viewsMenu: '.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.xdj266r',
	selectedConversation: '[role=navigation] [role=grid] [role=row] [role=gridcell] [role=link][aria-current=page]',
	// ! Very fragile selector (most likely cause of hidden dialog issue)
	preferencesSelector: '.x1n2onr6.x1ja2u2z.x1afcbsf.x78zum5.xdt5ytf.x1a2a7pz.x6ikm8r.x10wlt62.x71s49j.x1jx94hy.x1g2kw80.xxadwq3.x16n5opg.x3hh19s.xl7ujzl.x1kl8bxo.xhkep3z.xb3b7hn.xwhkkir.x1n7qst7.x17omtbh:has(.x1l90r2v.x1swvt13.x1pi30zi)',
	// TODO: Fix this selector for new design
	messengerSoundsSelector: '._374d ._6bkz',
	conversationMenuSelectorNewDesign: '[role=menu]',
};
