
const ViewProfileSidebar = ({ user }: { user?: any }) => {
    const getDesignation = (roles: string[] = []) => {
        if (roles.includes('DELIVERY_HEAD')) return 'Delivery Head';
        if (roles.includes('POD_LEAD') || user?.isPodHead) return 'Pod Lead';
        if (roles.includes('RECRUITER')) return 'Recruiter';
        if (roles.includes('ACCOUNT_MANAGER')) return 'Account Manager';
        return 'Staff';
    };

    const designation = getDesignation(user?.roles);
    const department = "US Staffing";

    // In case no user profile fetched
    const fullName = user?.fullName || "User";
    const email = user?.email || "";

    return (
        <div className="user-grid-card relative border border-slate-200 dark:border-slate-600 rounded-2xl overflow-hidden bg-white dark:bg-[#273142] h-full">
            <img src="/assets/images/user-grid/user-grid-bg1.png" alt="" className="w-full object-fit-cover" />
            <div className="pb-6 ms-6 mb-6 me-6 -mt-[100px]">
                <div className="text-center border-b border-slate-200 dark:border-slate-600">
                    <img
                        src={user?.profilePicture || "/assets/images/user-grid/user-grid-img14.png"}
                        alt={fullName}
                        className="border br-white border-[3px] w-[200px] h-[200px] rounded-full object-cover mx-auto bg-neutral-100"
                    />
                    <h6 className="mb-0 mt-4">{fullName}</h6>
                    <span className="text-neutral-500 dark:text-neutral-300 mb-4">{email}</span>
                </div>
                <div className="mt-6">
                    <h6 className="text-xl mb-4">Personal Info</h6>
                    <ul>
                        <li className="flex items-center gap-1 mb-3">
                            <span className="w-[30%] text-base font-semibold text-neutral-600 dark:text-neutral-200">Full Name</span>
                            <span className="w-[70%] text-neutral-500 dark:text-neutral-300 font-medium truncate">: {fullName}</span>
                        </li>
                        <li className="flex items-center gap-1 mb-3">
                            <span className="w-[30%] text-base font-semibold text-neutral-600 dark:text-neutral-200"> Email</span>
                            <span className="w-[70%] text-neutral-500 dark:text-neutral-300 font-medium truncate">: {email}</span>
                        </li>
                        <li className="flex items-center gap-1 mb-3">
                            <span className="w-[30%] text-base font-semibold text-neutral-600 dark:text-neutral-200"> Phone Number</span>
                            <span className="w-[70%] text-neutral-500 dark:text-neutral-300 font-medium truncate">: {user?.phone || 'N/A'}</span>
                        </li>
                        <li className="flex items-center gap-1 mb-3">
                            <span className="w-[30%] text-base font-semibold text-neutral-600 dark:text-neutral-200"> Department</span>
                            <span className="w-[70%] text-neutral-500 dark:text-neutral-300 font-medium truncate">: {department}</span>
                        </li>
                        <li className="flex items-center gap-1 mb-3">
                            <span className="w-[30%] text-base font-semibold text-neutral-600 dark:text-neutral-200"> Designation</span>
                            <span className="w-[70%] text-neutral-500 dark:text-neutral-300 font-medium truncate">: {designation}</span>
                        </li>
                        <li className="flex items-center gap-1 mb-3">
                            <span className="w-[30%] text-base font-semibold text-neutral-600 dark:text-neutral-200"> Languages</span>
                            <span className="w-[70%] text-neutral-500 dark:text-neutral-300 font-medium truncate">: {user?.language || 'English'}</span>
                        </li>
                        <li className="flex items-center gap-1">
                            <span className="w-[30%] text-base font-semibold text-neutral-600 dark:text-neutral-200"> Bio</span>
                            <span className="w-[70%] text-neutral-500 dark:text-neutral-300 font-medium line-clamp-3">: {user?.bio || 'No bio provided'}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ViewProfileSidebar;