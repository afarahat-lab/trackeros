export interface ILeaveRepository {
    getLeaveById(id: string): Promise<Leave>;
    createLeave(leave: Leave): Promise<Leave>;
    updateLeave(leave: Leave): Promise<Leave>;
    deleteLeave(id: string): Promise<void>;
}
