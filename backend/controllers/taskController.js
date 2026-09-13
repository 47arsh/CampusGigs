import Task from "../models/Task.js";

const createTask = async (req, res) => {
    try {
        const {
            title,
            description,
            reward,
            pickupLocation,
            dropLocation
        } = req.body;

        const newTask = await Task.create({
            title,
            description,
            reward,
            pickupLocation,
            dropLocation,
            createdBy: req.user.userId
        });

        res.status(201).json({
            message: "Task created successfully",
            task: newTask
        });

    } catch (error) {
        res.status(500).json({
            message: "Error creating task"
        });
    }
};

const getTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ status: "open" });

        res.status(200).json({
            message: "Tasks fetched successfully",
            tasks
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching tasks"
        });
    }
};

const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findById(id);

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.status(200).json({
            message: "Task fetched successfully",
            task
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching task"
        });
    }
};

// const acceptTask = async (req,res) => {
//     try{
//         const taskId = req.params.id;
//         const userId = req.user.userId;

//         const task = await Task.findById(taskId);
//         if(!task){
//             return res.status(404).json({
//                 message: "Task not found"
//             });
//         }
//         if(task.status !== "open"){
//             return res.status(400).json({
//                 message: "Task is not available for acceptance"
//             });
//         }
//         const updatedTask = await Task.findByIdAndUpdate(taskId, {
//             status: "accepted",
//             assignedTo: userId
//         }, { new: true });

//         res.status(200).json({
//             message: "Task accepted successfully",
//             task: updatedTask
//         });
//     }
//     catch(error){
//         res.status(500).json({
//             message: "Error accepting task"
//         });
//     }
// }

const acceptTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.userId;
        //inside mongoose findOneAndUpdate, we are checking if the task is open and also checking if the user is not the owner of the task. 
        //If both conditions are met, then we update the task status to accepted and assign it to the user.
        //also we do this inside findOneAndUpdate to avoid race conditions where two users try to accept the same task at the same time. This way, only one user will be able to accept the task and the other will get a 400 error.
        const updatedTask = await Task.findOneAndUpdate(
            {
                _id: taskId,
                status: "open",
                createdBy: { $ne: userId } //ne means not equal. This is to ensure that the user accepting the task is not the owner of the task.
            },
            {
                status: "accepted",
                assignedTo: userId
            },
            {
                new: true
            }
        );

        if (!updatedTask) {
            return res.status(400).json({
                message: "Task not found, unavailable, or cannot be accepted by the owner"
            });
        }

        res.status(200).json({
            message: "Task accepted successfully",
            task: updatedTask
        });

    } catch (error) {
        res.status(500).json({
            message: "Error accepting task"
        });
    }
};

const completeTask = async (req,res) => {
    try{
        const taskId = req.params.id;
        const userId = req.user.userId;

        const task = await Task.findById(taskId);
        if(!task){
            return res.status(404).json({
                message: "Task not found"
            });
        }
        if(task.status !== "accepted" || task.assignedTo.toString() !== userId){
            return res.status(403).json({
                message: "Task cannot be completed"
            });
        }
        const updatedTask = await Task.findByIdAndUpdate(taskId, {
            status: "completed"
        }, { new: true });

        res.status(200).json({
            message: "Task completed successfully",
            task: updatedTask
        });
    }
    catch(error){
        res.status(500).json({
            message: "Error completing task"
        });
    }
}

const cancelTask = async(req,res) => {
    try{
        const taskId = req.params.id;
        const userId = req.user.userId;

        const task = await Task.findById(taskId);

        if(!task){
            return res.status(404).json({
                message: "Task not found"
            });
        }

        if(userId !== task.createdBy.toString()){
            return res.status(403).json({
                message: "You are not authorized to cancel this task"
            });
        }
        if(task.status === "completed"){
            return res.status(400).json({
                message: "Completed tasks cannot be cancelled"
            });
        }
        if(task.status === "cancelled"){
            return res.status(400).json({
                message: "Task is already cancelled"
            });
        }
        if(task.status === "accepted"){
            return res.status(400).json({
                message: "Accepted tasks cannot be cancelled"
            });
        }
        const updatedTask = await Task.findByIdAndUpdate(taskId, {
            status: "cancelled"
        }, { new: true });

        res.status(200).json({
            message: "Task cancelled successfully",
            task: updatedTask
        });
    }
    catch(error){
        res.status(500).json({
            message: "Error cancelling task"
        });
    }
}

const getMyPostedTasks = async (req,res) => {
    try{
        const userId = req.user.userId;
        const tasks = await Task.find({ createdBy: userId });

        res.status(200).json({
            message: "My posted tasks fetched successfully",
            tasks: tasks
        });
    }
    catch(error){
        res.status(500).json({
            message: "Error fetching posted tasks"
        });
    }
}

const getMyAcceptedTasks = async (req,res) => {
    try{
        const userId = req.user.userId;
        const tasks = await Task.find({ assignedTo: userId }).populate("createdBy", "name email");

        res.status(200).json({
            message: "My accepted tasks fetched successfully",
            tasks: tasks
        });
    }
    catch(error){
        res.status(500).json({
            message: "Error fetching accepted tasks"
        });
    }
}

export {
    createTask,
    getTasks,
    getTaskById,
    acceptTask,
    completeTask,
    cancelTask,
    getMyPostedTasks,
    getMyAcceptedTasks
};